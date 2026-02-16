import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

const NavbarComponent = () => {
  const { authorized, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!authorized) {
    return (
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container>
          <Navbar.Brand href="/">Hired!</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <div className="ms-auto d-flex gap-2">
              <a href="/login" className="btn btn-primary">
                Login
              </a>
              <a href="/register" className="btn btn-primary">
                Register
              </a>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  }

  return (
    <Navbar expand="lg" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand href="/">Hired!</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/recommendations">Recommendations</Nav.Link>
            <Nav.Link href="/connections">Connections</Nav.Link>
          </Nav>
          <div className="d-flex gap-2">
            <a href="/me" className="btn btn-primary">
              Profile
            </a>
            <button className="btn btn-primary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavbarComponent;
