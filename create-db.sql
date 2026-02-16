CREATE DATABASE IF NOT EXISTS spa_images;
USE spa_images;

CREATE TABLE IF NOT EXISTS images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_url LONGTEXT,
  description TEXT,
  rating INT,
  position INT DEFAULT 0
);
