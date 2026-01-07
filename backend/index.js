require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const NodeCache = require("node-cache");
const cities = require("./cities.json");
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");

const app = express();
app.use(cors());

// ---------------------
// Cache for 5 minutes
// ---------------------
const cache = new NodeCache({ stdTTL: 300 });

// ---------------------
// Comfort Index Function
// ---------------------
function computeComfortIndex(weather) {
  const temp = weather.main.temp;
  const humidity = weather.main.humidity;
  const wind = weather.wind.speed;

  // Example formula: ideal temp = 22°C, less humidity & low wind preferred
  let score = 50 - Math.abs(temp - 22) * 2 - humidity * 0.2 - wind * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---------------------
// Fetch Weather for a City
// ---------------------
async function fetchWeather(city) {
  const cacheKey = `weather_${city.CityCode}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `https://api.openweathermap.org/data/2.5/weather?id=${city.CityCode}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;

  try {
    const response = await axios.get(url);
    const data = {
      name: city.Name,
      temp: response.data.main.temp,
      humidity: response.data.main.humidity,
      wind: response.data.wind.speed,
      description: response.data.weather[0].description,
      comfortIndex: computeComfortIndex(response.data)
    };
    cache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`Failed for city ${city.Name}:`, err.response?.data || err.message);
    throw err;
  }
}

// ---------------------
// JWT Middleware (Auth0)
// ---------------------
// 1️⃣ Replace YOUR_DOMAIN with your Auth0 domain (e.g., dev-4np41h43eznf72b2.us.auth0.com)
// 2️⃣ Replace YOUR_API_IDENTIFIER with the API Identifier you created in Auth0
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,                
    rateLimit: true,            
    jwksRequestsPerMinute: 5,   
    jwksUri: `https://dev-4np41h43eznf72b2.us.auth0.com/.well-known/jwks.json`
  }),
  audience: "https://weather-api",
  issuer: `https://dev-4np41h43eznf72b2.us.auth0.com/`,
  algorithms: ["RS256"]
});

// ---------------------
// Routes
// ---------------------
app.get("/", (req, res) => {
  res.send("Weather Analytics API running");
});

// Secured Weather Endpoint
app.get("/weather",  async (req, res) => {
  const cacheKey = "processed_weather";
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ cache: "HIT", data: cached });

  try {
    const weatherData = await Promise.all(cities.map(fetchWeather));
    weatherData.sort((a, b) => b.comfortIndex - a.comfortIndex); // Most comfortable first
    cache.set(cacheKey, weatherData);
    res.json({ cache: "MISS", data: weatherData });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// Debug Cache Endpoint
app.get("/debug-cache", checkJwt, (req, res) => {
  res.json({
    keys: cache.keys(),
    stats: cache.getStats()
  });
});

// ---------------------
// Start Server
// ---------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
