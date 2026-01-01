INSERT INTO genres (key, label, icon) VALUES
  ('drama', 'Drama', 'DRAMA'),
  ('comedy', 'Comedy', 'COMEDY'),
  ('tragedy', 'Tragedy', 'TRAGEDY'),
  ('thriller', 'Thriller', 'THRILLER'),
  ('mystery', 'Mystery', 'MYSTERY'),
  ('psychological', 'Psychological', 'PSYCHO'),
  ('inspirational', 'Inspirational', 'INSPIRE'),
  ('slice_of_life', 'Slice of Life', 'SLICE'),
  ('dark', 'Dark', 'DARK'),
  ('philosophical', 'Philosophical', 'PHILO')
ON CONFLICT (key) DO NOTHING;
