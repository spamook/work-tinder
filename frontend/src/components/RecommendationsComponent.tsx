// RecommendationsComponent.tsx
import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Container,
  Row,
  Col,
  Alert,
  Spinner,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";

interface Recommendation {
  pictureUrl: string;
  name: string;
  lastName: string;
  userId: number;
  bio: string;
  location: string;
  gender: string;
  education: string;
  languages: string;
  skills: string[];
  experience: string[];
  additionalCertificates: string;
}

function RecommendationsComponent() {
  const { authorized } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Redirect if not authorized
  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  // Fetch recommendations on mount
  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        "http://localhost:8080/recommendations",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setRecommendations(response.data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (actionLoading) return;

    const currentUser = recommendations[currentIndex];
    const token = localStorage.getItem("token");

    if (!token) {
      setError("No authentication token found");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await axios.post(
        `http://localhost:8080/connections/request/${currentUser.userId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setSuccessMessage(`Connection request sent to ${currentUser.name}!`);

      // Move to next recommendation after short delay
      setTimeout(() => {
        moveToNext();
        setSuccessMessage("");
      }, 1000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send connection request",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (actionLoading) return;

    const currentUser = recommendations[currentIndex];
    const token = localStorage.getItem("token");

    if (!token) {
      setError("No authentication token found");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await axios.post(
        `http://localhost:8080/recommendations/dismiss/${currentUser.userId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      moveToNext();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to dismiss user");
    } finally {
      setActionLoading(false);
    }
  };

  const moveToNext = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // No more recommendations
      setCurrentIndex(recommendations.length);
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "200px" }}
      >
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const currentUser = recommendations[currentIndex];
  const hasRecommendations =
    recommendations.length > 0 && currentIndex < recommendations.length;

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <h2 className="text-center mb-4">Find Your Match</h2>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              variant="success"
              dismissible
              onClose={() => setSuccessMessage("")}
            >
              {successMessage}
            </Alert>
          )}

          {!hasRecommendations ? (
            <Card className="text-center p-5">
              <Card.Body>
                <h3>No More Recommendations</h3>
                <p className="text-muted">
                  You've seen all available matches. Check back later for new
                  recommendations!
                </p>
              </Card.Body>
            </Card>
          ) : (
            <Card className="shadow-lg border-0">
              <Card.Body className="p-4">
                {/* Profile Picture - Centered */}
                <div className="text-center mb-4">
                  {currentUser.pictureUrl ? (
                    <img
                      src={`${currentUser.pictureUrl}`}
                      style={{
                        width: "200px",
                        height: "200px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "4px solid #dee2e6",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "200px",
                        height: "200px",
                        margin: "0 auto",
                        borderRadius: "50%",
                        backgroundColor: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "80px",
                        border: "4px solid #dee2e6",
                      }}
                    >
                      👤
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="text-center mb-3">
                  <h3 className="mb-1">
                    {currentUser.name} {currentUser.lastName}
                  </h3>
                  {currentUser.location && (
                    <p className="text-muted mb-2">📍 {currentUser.location}</p>
                  )}
                  {currentUser.gender && (
                    <span className="badge bg-secondary me-2">
                      {currentUser.gender}
                    </span>
                  )}
                </div>

                {/* Bio */}
                {currentUser.bio && (
                  <div className="mb-3">
                    <p className="text-center fst-italic">
                      "{currentUser.bio}"
                    </p>
                  </div>
                )}

                {/* Details Section */}
                <div className="mb-3" style={{ fontSize: "0.9rem" }}>
                  {currentUser.education && (
                    <div className="mb-2">
                      <strong>🎓 Education:</strong> {currentUser.education}
                    </div>
                  )}
                  {currentUser.languages && (
                    <div className="mb-2">
                      <strong>🌐 Languages:</strong> {currentUser.languages}
                    </div>
                  )}
                  {currentUser.additionalCertificates && (
                    <div className="mb-2">
                      <strong>📜 Interests:</strong>{" "}
                      {currentUser.additionalCertificates}
                    </div>
                  )}
                </div>

                {/* Skills */}
                {currentUser.skills && currentUser.skills.length > 0 && (
                  <div className="mb-3">
                    <strong>💡 Skills:</strong>
                    <div className="mt-1">
                      {currentUser.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="badge bg-primary me-1 mb-1"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {currentUser.experience &&
                  currentUser.experience.length > 0 && (
                    <div className="mb-3">
                      <strong>⚡ Experience:</strong>
                      <div className="mt-1">
                        {currentUser.experience.map((exp, index) => (
                          <span
                            key={index}
                            className="badge bg-success me-1 mb-1"
                          >
                            {exp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Counter */}
                <p className="text-center text-muted mb-4">
                  {currentIndex + 1} of {recommendations.length}
                </p>

                {/* Action Buttons */}
                <Row className="g-3">
                  <Col xs={6}>
                    <Button
                      variant="outline-danger"
                      size="lg"
                      className="w-100"
                      onClick={handleDecline}
                      disabled={actionLoading}
                      style={{ height: "60px", fontSize: "18px" }}
                    >
                      {actionLoading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <>✕</>
                      )}
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      variant="success"
                      size="lg"
                      className="w-100"
                      onClick={handleSendRequest}
                      disabled={actionLoading}
                      style={{ height: "60px", fontSize: "18px" }}
                    >
                      {actionLoading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <>♥</>
                      )}
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default RecommendationsComponent;
