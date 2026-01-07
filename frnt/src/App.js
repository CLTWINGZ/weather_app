import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Container, Form, Row, Col, Spinner, Button } from "react-bootstrap";
import { useAuth0 } from "@auth0/auth0-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import "./App.css";

function App() {
  const { isLoading, isAuthenticated, error, loginWithRedirect: login, logout: auth0Logout, user, getAccessTokenSilently } = useAuth0();

  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [sortKey, setSortKey] = useState("comfortIndex"); // default sort
  const [sortOrder, setSortOrder] = useState("desc"); // asc or desc
  const [darkMode, setDarkMode] = useState(false);

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
  }, [darkMode]);

  // Fetch weather data with JWT token
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchWeather = async () => {
      try {
        // Get Auth0 access token
        const token = await getAccessTokenSilently({
          audience: "https://weather-api" // must match your Auth0 API identifier
        });

        // Fetch weather data from backend with Authorization header
        const res = await axios.get("http://localhost:5000/weather", {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCities(res.data.data || res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setFetchError("Failed to fetch weather data");
        setLoading(false);
      }
    };

    fetchWeather();
  }, [isAuthenticated, getAccessTokenSilently]);

  // Filter + Sort
  const filteredCities = cities
    .filter(city => city.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sortOrder === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));

  // Comfort score colors
  const getComfortColor = (score) => {
    if (score >= 50) return "green";
    if (score >= 20) return "orange";
    return "red";
  };

  if (isLoading) return <div className="text-center mt-5">Loading Auth0...</div>;

  if (!isAuthenticated) {
    return (
      <div className="text-center mt-5">
        {error && <p className="text-danger">Error: {error.message}</p>}
        <h2>Please log in to access the Comfort Index Dashboard</h2>
        <Button variant="primary" className="me-2" onClick={login}>Login</Button>
      </div>
    );
  }

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> Loading Weather...</div>;
  if (fetchError) return <div className="text-center mt-5 text-danger">{fetchError}</div>;

  return (
    <Container className="my-4">

      {/* Header: Dark Mode Toggle & Logout */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="me-3">{user.email}</span>
          <Button variant="danger" onClick={() => auth0Logout({ logoutParams: { returnTo: window.location.origin } })}>
            Logout
          </Button>
        </div>
        <Button variant="secondary" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </Button>
      </div>

      <h1 className="text-center mb-4">Weather Comfort Ranking</h1>

      {/* Search + Sort Controls */}
      <Row className="mb-3">
        <Col md={6} className="mx-auto mb-2">
          <Form.Control
            type="text"
            placeholder="Search city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={6} className="mx-auto d-flex justify-content-center gap-2">
          <Button size="sm" onClick={() => { setSortKey("comfortIndex"); setSortOrder("desc"); }}>Comfort ↓</Button>
          <Button size="sm" onClick={() => { setSortKey("temp"); setSortOrder("asc"); }}>Temp ↑</Button>
          <Button size="sm" onClick={() => { setSortKey("temp"); setSortOrder("desc"); }}>Temp ↓</Button>
        </Col>
      </Row>

      {/* Desktop Table */}
      <div className="d-none d-md-block">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Rank</th>
              <th>City</th>
              <th>Temp (°C)</th>
              <th>Humidity (%)</th>
              <th>Wind (m/s)</th>
              <th>Comfort Score</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredCities.map((city, index) => (
              <tr key={city.name}>
                <td>{index + 1}</td>
                <td>{city.name}</td>
                <td>{city.temp}</td>
                <td>{city.humidity}</td>
                <td>{city.wind}</td>
                <td style={{ fontWeight: "bold", color: getComfortColor(city.comfortIndex) }}>
                  {city.comfortIndex}
                </td>
                <td>{city.description}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="d-block d-md-none">
        {filteredCities.map((city, index) => (
          <div key={city.name} className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">{index + 1}. {city.name}</h5>
              <p className="card-text">{city.description}</p>
              <p className="card-text">Temp: {city.temp}°C</p>
              <p className="card-text">Humidity: {city.humidity}%</p>
              <p className="card-text">Wind: {city.wind} m/s</p>
              <p className="card-text">
                Comfort Score:
                <span style={{ fontWeight: "bold", color: getComfortColor(city.comfortIndex) }}>
                  {city.comfortIndex}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Temperature Trend Graph */}
      <h3 className="mt-4 mb-3 text-center">Temperature Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={filteredCities} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="temp" stroke="#007bff" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>

    </Container>
  );
}

export default App;
