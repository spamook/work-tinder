import React, { useEffect, useRef, useState } from "react";
import { Form, Button, Row, Col, Alert } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";

interface UserData {
  firstName: string;
  lastName: string;
  pfp: string;
  bio: string;
  gender: string;
  lookingFor: string;
  interests: string;
  hobbies: string;
  musicTaste: string;
  foodPreference: string;
  travelPreference: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

const UpdateProfile: React.FC = () => {
  const { checkProfileCompletion } = useAuth();
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState(true); // For initial fetch
  const [submitting, setSubmitting] = useState(false); // For form submission
  const { logout } = useAuth();
  const navigate = useNavigate();
  const hasFetchedRef = useRef(false);

  const [form, setForm] = useState<UserData>({
    firstName: "",
    lastName: "",
    bio: "",
    pfp: "",
    gender: "",
    lookingFor: "",
    interests: "",
    hobbies: "",
    musicTaste: "",
    foodPreference: "",
    travelPreference: "",
    location: "",
    latitude: null,
    longitude: null,
  });

  // Fetch the user data on mount
  useEffect(() => {
    if (hasFetchedRef.current) return;

    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setInitialLoading(false);
        return;
      }

      hasFetchedRef.current = true;

      try {
        const res = await axios.get("http://localhost:8080/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setForm({
          firstName: res.data.firstName || "",
          lastName: res.data.lastName || "",
          pfp: res.data.profilePictureUrl || "",
          gender: res.data.gender || "",
          bio: res.data.bio || "",
          lookingFor: res.data.lookingFor || "",
          travelPreference: res.data.travelPreference || "",
          musicTaste: res.data.musicTaste || "",
          foodPreference: res.data.foodPreference || "",
          location: res.data.location || "",
          // Handle both string and array formats from backend
          hobbies: Array.isArray(res.data.hobbies)
            ? res.data.hobbies.join(", ")
            : res.data.hobbies || "",
          interests: Array.isArray(res.data.interests)
            ? res.data.interests.join(", ")
            : res.data.interests || "",
          latitude: res.data.latitude || null,
          longitude: res.data.longitude || null,
        });
      } catch (err: any) {
        if (err.response?.status === 401) {
          logout();
          navigate("/login");
        } else {
          setError("Failed to load profile data. Using empty form.");
        }
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "latitude" || name === "longitude") {
      setForm({
        ...form,
        [name]: value === "" ? null : parseFloat(value),
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found. Please log in again.");
      setSubmitting(false);
      return;
    }

    // Parse interests and hobbies from comma-separated strings
    const interestsArray = form.interests
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const hobbiesArray = form.hobbies
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      pfp: form.pfp,
      bio: form.bio,
      gender: form.gender,
      lookingFor: form.lookingFor,
      interests: interestsArray,
      hobbies: hobbiesArray,
      musicTaste: form.musicTaste,
      foodPreference: form.foodPreference,
      travelPreference: form.travelPreference,
      location: form.location,
      latitude: form.latitude || 0,
      longitude: form.longitude || 0,
    };

    try {
      await axios.patch("http://localhost:8080/me", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      });

      setSuccess(true);
      setError("");

      await checkProfileCompletion();

      setTimeout(() => {
        navigate("/me");
      }, 1500);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const errorMsg =
            error.response.data?.message ||
            error.response.data?.error ||
            JSON.stringify(error.response.data) ||
            `Server error: ${error.response.status}`;

          setError(`Failed to update profile: ${errorMsg}`);
        } else if (error.request) {
          setError(
            "No response from server. Is the backend running on http://localhost:8080?",
          );
        } else {
          setError(`Request error: ${error.message}`);
        }
      } else {
        setError(`Unexpected error: ${String(error)}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading spinner during initial data fetch
  if (initialLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "200px" }}
      >
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Update Your Profile</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          ✅ Profile updated successfully! Redirecting...
        </Alert>
      )}
      <br />

      {form.pfp ? (
        <img className="pfp" src={`${form.pfp}`} alt="Profile" width={100} />
      ) : (
        <p>No profile picture</p>
      )}

      <Form onSubmit={handleSubmit}>
        <Row>
          <Col>
            <Form.Group className="mb-3" controlId="firstName">
              <Form.Label>First Name *</Form.Label>
              <Form.Control
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                required
                disabled={submitting}
              />
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3" controlId="lastName">
              <Form.Label>Last Name *</Form.Label>
              <Form.Control
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                required
                disabled={submitting}
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3" controlId="bio">
          <Form.Label>Bio *</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself"
            required
            disabled={submitting}
          />
        </Form.Group>

        <Row>
          <Col>
            <Form.Group className="mb-3" controlId="gender">
              <Form.Label>Gender *</Form.Label>
              <Form.Select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
                disabled={submitting}
              >
                <option value="">Select your gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to tell">Prefer not to tell</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3" controlId="lookingFor">
              <Form.Label>Looking For *</Form.Label>
              <Form.Select
                name="lookingFor"
                value={form.lookingFor}
                onChange={handleChange}
                required
                disabled={submitting}
              >
                <option value="">Select preference</option>
                <option value="Employees">Employees</option>
                <option value="Employers">Employers</option>
                <option value="Both">Both</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        <Form.Group className="mb-3" controlId="interests">
          <Form.Label>Experience (comma-separated) *</Form.Label>
          <Form.Control
            type="text"
            name="interests"
            value={form.interests}
            onChange={handleChange}
            placeholder="e.g., Coding, Testing"
            required
            disabled={submitting}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="hobbies">
          <Form.Label>Skills (comma-separated) *</Form.Label>
          <Form.Control
            type="text"
            name="hobbies"
            value={form.hobbies}
            onChange={handleChange}
            placeholder="e.g., Walking"
            required
            disabled={submitting}
          />
        </Form.Group>
        <Row>
          <Col>
            <Form.Group className="mb-3" controlId="musicTaste">
              <Form.Label>Education *</Form.Label>
              <Form.Control
                type="text"
                name="musicTaste"
                value={form.musicTaste}
                onChange={handleChange}
                placeholder="Education"
                required
                disabled={submitting}
              />
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="mb-3" controlId="foodPreference">
              <Form.Label>Languages (comma-separated) *</Form.Label>
              <Form.Control
                type="text"
                name="foodPreference"
                value={form.foodPreference}
                onChange={handleChange}
                placeholder="Languages"
                required
                disabled={submitting}
              />
            </Form.Group>
          </Col>
        </Row>
        <Form.Group className="mb-3" controlId="travelPreference">
          <Form.Label>
            Additional Certificates (write "none" if you don't have any) *
          </Form.Label>
          <Form.Control
            type="text"
            name="travelPreference"
            value={form.travelPreference}
            onChange={handleChange}
            placeholder="Additional certificates"
            required
            disabled={submitting}
          />
        </Form.Group>
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="location">
              <Form.Label>Location *</Form.Label>
              <Form.Control
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="City"
                required
                disabled={submitting}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="latitude">
              <Form.Label>Latitude</Form.Label>
              <Form.Control
                type="number"
                step="any"
                name="latitude"
                value={form.latitude || ""}
                onChange={handleChange}
                placeholder="e.g., 40.71"
                disabled={submitting}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="longitude">
              <Form.Label>Longitude</Form.Label>
              <Form.Control
                type="number"
                step="any"
                name="longitude"
                value={form.longitude || ""}
                onChange={handleChange}
                placeholder="e.g., -74.00"
                disabled={submitting}
              />
            </Form.Group>
          </Col>
        </Row>
        <Button
          variant="primary"
          type="submit"
          disabled={submitting}
          className="w-100"
        >
          {submitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Updating Profile...
            </>
          ) : (
            "Update Profile"
          )}
        </Button>
      </Form>
      <br />
    </div>
  );
};

export default UpdateProfile;
