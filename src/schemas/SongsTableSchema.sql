CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    artist TEXT,
    album TEXT,
    year INTEGER,
    file_path TEXT,
    duration REAL,
    sample_rate INTEGER,
    UNIQUE(name, artist, album, year)
);