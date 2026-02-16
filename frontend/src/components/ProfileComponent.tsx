import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, ListGroup, Button, Alert, Form, Modal } from "react-bootstrap";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  pfp: string;
  gender: string;
  bio: string;
  lookingFor: string;
  travelPreference: string;
  musicTaste: string;
  foodPreference: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  hobbies: string[];
  interests: string[];
}

function ProfileComponent() {
  const [user, setUser] = useState<User>({
    id: 0,
    firstName: "",
    lastName: "",
    pfp: "",
    gender: "",
    bio: "",
    lookingFor: "",
    travelPreference: "",
    musicTaste: "",
    foodPreference: "",
    location: "",
    latitude: null,
    longitude: null,
    hobbies: [],
    interests: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;

    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      hasFetchedRef.current = true;

      try {
        const res = await axios.get("http://localhost:8080/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser({
          id: res.data.id,
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          pfp: res.data.profilePictureUrl,
          gender: res.data.gender,
          bio: res.data.bio,
          lookingFor: res.data.lookingFor,
          travelPreference: res.data.travelPreference,
          musicTaste: res.data.musicTaste,
          foodPreference: res.data.foodPreference,
          location: res.data.location,
          latitude: res.data.latitude,
          longitude: res.data.longitude,
          hobbies: res.data.hobbies,
          interests: res.data.interests,
        });
      } catch (err: any) {
        if (err.response?.status === 401) {
          logout();
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError(
        "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
      );
      return;
    }

    // Validate file size (max 1MB)
    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    if (file.size > maxSize) {
      setUploadError(
        `File size (${(file.size / 1024 / 1024).toFixed(
          2,
        )}MB) exceeds the 1MB limit`,
      );
      return;
    }

    setSelectedFile(file);
    setUploadError("");
    setUploadSuccess("");

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setUploadError("No authentication token found. Please log in again.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post(
        "http://localhost:8080/me/photo",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type, let axios handle it
          },
          timeout: 30000, // 30 second timeout
        },
      );

      setUploadSuccess("Profile picture updated successfully!");

      const newPhotoUrl =
        response.data.profilePictureUrl ||
        response.data.photoUrl ||
        response.data.url ||
        response.data;

      setUser((prevUser) => ({
        ...prevUser,
        pfp: typeof newPhotoUrl === "string" ? newPhotoUrl : prevUser.pfp,
      }));

      // Clear the selected file and preview
      setSelectedFile(null);
      setPreviewUrl("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess("");
      }, 1000);
    } catch (error: any) {
      let errorMessage = "Failed to upload photo. Please try again.";

      if (axios.isAxiosError(error)) {
        if (error.response) {
          if (typeof error.response.data === "string") {
            errorMessage =
              error.response.data || `Server error (${error.response.status})`;
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.status === 413) {
            errorMessage = "File is too large. Maximum size is 1MB.";
          } else if (error.response.status === 415) {
            errorMessage =
              "Unsupported file type. Please use JPEG, PNG, GIF, or WebP.";
          } else if (error.response.status === 500) {
            errorMessage =
              "Server error while processing the image. Please try a different image.";
          } else {
            errorMessage = `Upload failed with status ${error.response.status}`;
          }
        } else if (error.request) {
          errorMessage =
            "No response from server. Check if backend is running on http://localhost:8080";
        } else if (error.code === "ECONNABORTED") {
          errorMessage =
            "Upload timed out. The file might be too large or connection is slow.";
        } else {
          errorMessage = `Request error: ${error.message}`;
        }
      } else {
        errorMessage = `Unexpected error: ${String(error)}`;
      }

      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUploadError("No authentication token found. Please log in again.");
      return;
    }

    setDeleting(true);
    setUploadError("");
    setUploadSuccess("");
    setShowDeleteModal(false);

    try {
      await axios.delete("http://localhost:8080/me/photo", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUploadSuccess("Profile picture deleted successfully!");

      setUser((prevUser) => ({
        ...prevUser,
        pfp: "",
      }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess("");
      }, 3000);
    } catch (error: any) {
      let errorMessage = "Failed to delete photo. Please try again.";

      if (axios.isAxiosError(error)) {
        if (error.response) {
          if (typeof error.response.data === "string") {
            errorMessage =
              error.response.data || `Server error (${error.response.status})`;
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data?.error) {
            errorMessage = error.response.data.error;
          } else {
            errorMessage = `Delete failed with status ${error.response.status}`;
          }
        } else if (error.request) {
          errorMessage = "No response from server. Check your connection.";
        } else {
          errorMessage = `Request error: ${error.message}`;
        }
      }

      setUploadError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  // Trigger file input click
  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  // Cancel selection
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setUploadError("");
    setUploadSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  return (
    <div>
      <div className="text-center mb-4">
        {/* Current Profile Picture */}
        <div className="mb-3">
          {user.pfp ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                className="pfp rounded-circle"
                src={`${user.pfp}`}
                alt="Profile"
                width={150}
                height={150}
                style={{ objectFit: "cover", border: "3px solid #dee2e6" }}
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                style={{
                  position: "absolute",
                  bottom: "5px",
                  right: "5px",
                  borderRadius: "50%",
                  width: "35px",
                  height: "35px",
                  padding: "0",
                  fontSize: "18px",
                }}
                title="Delete photo"
              >
                🗑️
              </Button>
            </div>
          ) : (
            <div
              style={{
                width: "150px",
                height: "150px",
                margin: "0 auto",
                borderRadius: "50%",
                backgroundColor: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "60px",
                border: "3px solid #dee2e6",
              }}
            >
              👤
            </div>
          )}
        </div>

        <h1>{user.firstName + " " + user.lastName || "User"}</h1>

        {/* Image Upload Section */}
        <Card className="mt-4 mb-4">
          <Card.Body>
            <h5 className="mb-3">Update Profile Picture</h5>

            {uploadError && (
              <Alert
                variant="danger"
                dismissible
                onClose={() => setUploadError("")}
              >
                <strong>Error:</strong> {uploadError}
              </Alert>
            )}

            {uploadSuccess && (
              <Alert
                variant="success"
                dismissible
                onClose={() => setUploadSuccess("")}
              >
                {uploadSuccess}
              </Alert>
            )}

            {/* Preview Selected Image */}
            {previewUrl && (
              <div className="mb-3">
                <p className="text-muted mb-2">Preview:</p>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: "200px",
                    maxHeight: "200px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    border: "2px solid #dee2e6",
                  }}
                />
                <p className="text-muted mt-2 small">
                  {selectedFile?.name} ({(selectedFile!.size / 1024).toFixed(2)}{" "}
                  KB)
                </p>
              </div>
            )}

            {/* Hidden File Input */}
            <Form.Control
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: "none" }}
            />

            {/* Action Buttons */}
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              {!selectedFile ? (
                <Button
                  variant="outline-primary"
                  onClick={handleSelectClick}
                  disabled={uploading || deleting}
                >
                  📁 Select Photo
                </Button>
              ) : (
                <>
                  <Button
                    variant="success"
                    onClick={handleUpload}
                    disabled={uploading || deleting}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Uploading...
                      </>
                    ) : (
                      "✓ Upload Photo"
                    )}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={handleCancel}
                    disabled={uploading || deleting}
                  >
                    ✕ Cancel
                  </Button>
                  <Button
                    variant="outline-primary"
                    onClick={handleSelectClick}
                    disabled={uploading || deleting}
                  >
                    Choose Different
                  </Button>
                </>
              )}
            </div>

            <p className="text-muted mt-3 mb-0 small">
              Supported formats: JPEG, PNG, GIF, WebP • Max size: 1MB
            </p>
          </Card.Body>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Profile Picture</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete your profile picture? This action
          cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeletePhoto}>
            Delete Photo
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Profile Information Card */}
      <Card>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <strong>Bio:</strong> {user.bio || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Gender:</strong> {user.gender || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Looking For:</strong> {user.lookingFor || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Additional Certificates:</strong>{" "}
              {user.travelPreference || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Education:</strong> {user.musicTaste || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Languages :</strong> {user.foodPreference || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Location:</strong> {user.location || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Latitude:</strong>{" "}
              {user.latitude !== null ? user.latitude : "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Longitude:</strong>{" "}
              {user.longitude !== null ? user.longitude : "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Skills:</strong>{" "}
              {user.hobbies?.length > 0 ? user.hobbies.join(", ") : "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Experience:</strong>{" "}
              {user.interests?.length > 0 ? user.interests.join(", ") : "N/A"}
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      <br />
      <Button variant="primary" href="/complete-profile">
        Edit Profile
      </Button>
    </div>
  );
}

export default ProfileComponent;
