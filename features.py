import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter, generate_binary_structure, iterate_structure
from scipy.signal import spectrogram
import hashlib
from collections import defaultdict, Counter

# Configuration
SAMPLE_RATE = 44100
WINDOW_SIZE = 4096
OVERLAP_RATIO = 0.5
PEAK_NEIGHBORHOOD_SIZE = 20
MIN_AMPLITUDE = 10
FAN_VALUE = 15           # How many peaks to pair with each anchor
MIN_TIME_DELTA = 0
MAX_TIME_DELTA = 200


def get_spectrogram(samples, sample_rate=SAMPLE_RATE):
    """Compute log-magnitude spectrogram."""
    nperseg = WINDOW_SIZE
    noverlap = int(WINDOW_SIZE * OVERLAP_RATIO)
    freqs, times, spec = spectrogram(
        samples,
        fs=sample_rate,
        nperseg=nperseg,
        noverlap=noverlap,
        window='hann'
    )
    # Convert to log scale (dB), avoiding log(0)
    spec = 10 * np.log10(spec + 1e-10)
    return spec


def find_peaks(spec, amp_min=MIN_AMPLITUDE):
    """Find local maxima in the spectrogram."""
    # Build a 2D neighborhood structure
    struct = generate_binary_structure(2, 2)
    neighborhood = iterate_structure(struct, PEAK_NEIGHBORHOOD_SIZE)

    # Local max where each point equals the max of its neighborhood
    local_max = maximum_filter(spec, footprint=neighborhood) == spec

    # Filter out background (low amplitude points)
    background = (spec <= amp_min)
    detected_peaks = local_max & ~background

    # Get coordinates: (frequency_idx, time_idx)
    freq_idxs, time_idxs = np.where(detected_peaks)
    amps = spec[freq_idxs, time_idxs]

    # Sort by time so pairing is consistent
    peaks = list(zip(freq_idxs, time_idxs, amps))
    peaks.sort(key=lambda p: p[1])
    return peaks


def generate_hashes(peaks, fan_value=FAN_VALUE):
    """
    Pair each peak (anchor) with FAN_VALUE later peaks.
    Hash = (freq1, freq2, time_delta) -> anchor_time
    """
    hashes = []
    n = len(peaks)
    for i in range(n):
        for j in range(1, fan_value + 1):
            if i + j >= n:
                break
            f1, t1, _ = peaks[i]
            f2, t2, _ = peaks[i + j]
            t_delta = t2 - t1
            if MIN_TIME_DELTA <= t_delta <= MAX_TIME_DELTA:
                # Hash the triplet
                h = hashlib.sha1(
                    f"{f1}|{f2}|{t_delta}".encode()
                ).hexdigest()[:20]
                hashes.append((h, t1))
    return hashes


def fingerprint_audio(samples, sample_rate=SAMPLE_RATE):
    """End-to-end fingerprinting of an audio signal."""
    spec = get_spectrogram(samples, sample_rate)
    peaks = find_peaks(spec)
    return generate_hashes(peaks)


class FingerprintDatabase:
    """In-memory database mapping hash -> [(song_id, offset), ...]"""

    def __init__(self):
        self.db = defaultdict(list)
        self.songs = {}  # song_id -> name

    def add_song(self, song_id, name, samples, sample_rate=SAMPLE_RATE):
        self.songs[song_id] = name
        hashes = fingerprint_audio(samples, sample_rate)
        for h, offset in hashes:
            self.db[h].append((song_id, offset))
        print(f"Added '{name}' with {len(hashes)} hashes")

    def match(self, samples, sample_rate=SAMPLE_RATE):
        """
        Recognize a (possibly noisy) audio clip.
        Returns the best-matching song, confidence score, and total matching hashes.
        """
        query_hashes = fingerprint_audio(samples, sample_rate)

        # For each matching hash, record (song_id, offset_difference)
        # Real matches will cluster around a single offset difference.
        offset_counter = Counter()
        for h, query_offset in query_hashes:
            if h in self.db:
                for song_id, song_offset in self.db[h]:
                    delta = song_offset - query_offset
                    offset_counter[(song_id, delta)] += 1

        if not offset_counter:
            return None, 0, 0

        (best_song_id, best_offset), count = offset_counter.most_common(1)[0]
        total_matches = sum(c for (sid, delta), c in offset_counter.items() if sid == best_song_id)
        return self.songs[best_song_id], count, total_matches


# Example usage
if __name__ == "__main__":
    def load_wav(path):
        rate, data = wavfile.read(path)
        if data.ndim > 1:           # convert stereo to mono
            data = data.mean(axis=1)
        return data.astype(np.float32), rate

    db = FingerprintDatabase()

    # Build the database
    samples, rate = load_wav("song1.wav")
    db.add_song(1, "Song One", samples, rate)

    samples, rate = load_wav("song2.wav")
    db.add_song(2, "Song Two", samples, rate)

    # Match a query clip (e.g., a 10-second noisy snippet)
    query, rate = load_wav("query.wav")
    name, score, total = db.match(query, rate)
    print(f"Best match: {name} (confidence: {score}, total matches: {total})")