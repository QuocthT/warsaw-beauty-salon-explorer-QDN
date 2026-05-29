SELECT 
  COUNT(*) as total,
  COUNT(phone) as has_phone,
  COUNT(rating) as has_rating,
  COUNT(website) as has_website
FROM salons;

