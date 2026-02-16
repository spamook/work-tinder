package web.match_me.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import web.match_me.entity.Connection;
import web.match_me.entity.User;
import web.match_me.repository.UserRepository;
import web.match_me.service.ConnectionService;
import web.match_me.service.ProfileService;
import web.match_me.service.RecommendationService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class APIController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileService profileService;

    @Autowired
    private ConnectionService connectionService;

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private web.match_me.service.DataSeedingService dataSeedingService;

    // Helper: Validate Access (Self or Connected)
    private boolean canViewProfile(User requester, User target) {
        if (requester.getId().equals(target.getId()))
            return true;
        return connectionService.areConnected(requester, target);
    }

    // 0. /seed
    @PostMapping("/seed")
    public ResponseEntity<Map<String, String>> seedUsers(@RequestParam(defaultValue = "100") int count) {
        dataSeedingService.seedUsers(count);
        return ResponseEntity.ok(Map.of("message", "Seeding complete for " + count + " users."));
    }

    // 1. /users/{id}
    @GetMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> getUserBasic(@PathVariable Long id, Authentication authentication) {
        User requester = userRepository.findByEmail(authentication.getName()).orElseThrow();
        User target = userRepository.findById(id).orElse(null);

        if (target == null || !canViewProfile(requester, target)) {
            return ResponseEntity.notFound().build();
        }

        return profileService.getProfileByUserId(id)
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getUser().getId());
                    map.put("name", p.getFirstName() + " " + p.getLastName());
                    map.put("profilePictureUrl", p.getProfilePictureUrl() != null ? p.getProfilePictureUrl() : "");
                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 2. /users/{id}/profile
    @GetMapping("/users/{id}/profile")
    public ResponseEntity<Map<String, Object>> getUserProfile(@PathVariable Long id, Authentication authentication) {
        User requester = userRepository.findByEmail(authentication.getName()).orElseThrow();
        User target = userRepository.findById(id).orElse(null);

        if (target == null || !canViewProfile(requester, target)) {
            return ResponseEntity.notFound().build();
        }

        return profileService.getProfileByUserId(id)
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getUser().getId());
                    map.put("aboutMe", p.getBio());
                    map.put("lookingFor", p.getLookingFor());
                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. /users/{id}/bio
    @GetMapping("/users/{id}/bio")
    public ResponseEntity<Map<String, Object>> getUserBio(@PathVariable Long id, Authentication authentication) {
        User requester = userRepository.findByEmail(authentication.getName()).orElseThrow();
        User target = userRepository.findById(id).orElse(null);

        if (target == null || !canViewProfile(requester, target)) {
            return ResponseEntity.notFound().build();
        }

        return profileService.getProfileByUserId(id)
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getUser().getId());
                    map.put("gender", p.getGender());
                    map.put("interests", p.getInterests());
                    map.put("hobbies", p.getHobbies());
                    map.put("musicTaste", p.getMusicTaste());
                    map.put("foodPreference", p.getFoodPreference());
                    map.put("travelPreference", p.getTravelPreference());
                    map.put("location", p.getLocation());
                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. /me Shortcuts
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        // Self is always allowed, so we directly call logic similar to getUserBasic but
        // for self
        return profileService.getProfileByUserId(user.getId())
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getUser().getId());
                    map.put("name", p.getFirstName() + " " + p.getLastName());
                    map.put("profilePictureUrl", p.getProfilePictureUrl() != null ? p.getProfilePictureUrl() : "");
                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/profile")
    public ResponseEntity<Map<String, Object>> getMeProfile(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return profileService.getProfileByUserId(user.getId())
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getUser().getId());
                    map.put("aboutMe", p.getBio());
                    map.put("lookingFor", p.getLookingFor());
                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/bio")
    public ResponseEntity<Map<String, Object>> getMeBio(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return profileService.getProfileByUserId(user.getId())
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getUser().getId());
                    map.put("gender", p.getGender());
                    map.put("interests", p.getInterests());
                    map.put("hobbies", p.getHobbies());
                    map.put("musicTaste", p.getMusicTaste());
                    map.put("foodPreference", p.getFoodPreference());
                    map.put("travelPreference", p.getTravelPreference());
                    map.put("location", p.getLocation());
                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 5. /recommendations (IDs only)
    @GetMapping("/recommendations")
    public ResponseEntity<List<Long>> getRecommendations(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<Long> recommendedIds = recommendationService.getRecommendations(user);
        return ResponseEntity.ok(recommendedIds);
    }

    // 6. /connections (IDs only)
    @GetMapping("/connections")
    public ResponseEntity<List<Long>> getConnections(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<Connection> connections = connectionService.getMyConnections(user);

        List<Long> connectionIds = connections.stream()
                .map(c -> {
                    User partner = c.getRequester().equals(user) ? c.getReceiver() : c.getRequester();
                    return partner.getId();
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(connectionIds);
    }
}
