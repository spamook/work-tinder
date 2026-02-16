import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthService from "../AuthService";

const RegisterComponent = () => {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const navigate = useNavigate();

	const handleRegister = async (e: { preventDefault: () => void }) => {
		e.preventDefault();
		try {
			const response = await AuthService.register({ username, email, password });
			setMessage(response.data);
			if (response.data.message === "User registered successfully") {
				navigate("/login");
			}
		} catch (error) {
			setMessage("Registration failed");
		}
	};

	return (
		<div className="container mt-5">
			<div className="row justify-content-center">
				<div className="col-md-6">
					<div className="card">
						<div className="card-header">Registration</div>
						<div className="card-body">
							{message && <div className="alert alert-danger">{message}</div>}
							<form onSubmit={handleRegister}>
								<div className="form-group">
									<label>Username</label>
									<input
										type="text"
										className="form-control"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
									/>
								</div>
								<div className="form-group">
									<label>Email</label>
									<input
										type="email"
										className="form-control"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
								<div className="form-group">
									<label>Password</label>
									<input
										type="password"
										className="form-control"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
									/>
								</div>
								<br />
								<button type="submit" className="btn btn-primary">
									Register
								</button>
							</form>
							<div className="mt-3">
								<span>
									Already registered? <Link to="/login">Login here</Link>
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RegisterComponent;
