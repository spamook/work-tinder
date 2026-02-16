package web.match_me.controller;

import web.match_me.entity.User;
import web.match_me.repository.UserRepository;
import web.match_me.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class AuthenticationController {

    private AuthenticationManager authenticationManager;
    private UserRepository userRepository;
    private PasswordEncoder encoder;
    private JwtUtil jwtUtils;

    @Autowired
    public AuthenticationController(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            PasswordEncoder encoder,
            JwtUtil jwtUtils) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.encoder = encoder;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/signin")
    public ResponseEntity<Map<String, String>> authenticateUser(@RequestBody Map<String, String> loginRequest) {
        // Expecting email and password
        String email = loginRequest.get("email");
        String password = loginRequest.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }
        // Ban System from DB by putting Enabled-False
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null && !user.isEnabled()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "User Banned by Admin");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password));

        final UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtUtils.generateToken(userDetails.getUsername()); // This will be email

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        response.put("message", "Login successful");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, String>> registerUser(@RequestBody User user) {
        Map<String, String> response = new HashMap<>();

        if (user.getUsername() == null || user.getEmail() == null || user.getPassword() == null) {
            response.put("message", "Username, Email and Password are required");
            return ResponseEntity.badRequest().body(response);
        }

        if (userRepository.existsByUsername(user.getUsername())) {
            response.put("message", "Error: Username is already taken!");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        }

        if (userRepository.existsByEmail(user.getEmail())) {
            response.put("message", "Error: Email is already in use!");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        }

        User newUser = new User();
        newUser.setUsername(user.getUsername());
        newUser.setEmail(user.getEmail());
        newUser.setPassword(encoder.encode(user.getPassword()));
        newUser.setEnabled(true);

        userRepository.save(newUser);

        response.put("message", "User registered successfully");
        return ResponseEntity.ok(response);
    }
}
