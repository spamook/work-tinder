package web.match_me.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import web.match_me.entity.User;
import web.match_me.repository.UserRepository;
import web.match_me.service.ProfileService;
import web.match_me.service.RecommendationService;
import web.match_me.security.UserDetailsImpl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/recommendations")
public class RecommendationController {

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileService profileService;

    @GetMapping
    public ResponseEntity<?> getRecommendations(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow();

        List<Long> recommendedIds = recommendationService.getRecommendations(user);

        // Enrich with comprehensive profile data for the UI card
        List<Map<String, Object>> response = recommendedIds.stream().map(id -> {
            return profileService.getProfileByUserId(id).map(p -> {
                Map<String, Object> map = new HashMap<>();
                map.put("userId", p.getUser().getId());
                map.put("name", p.getFirstName() != null ? p.getFirstName() : "");
                map.put("lastName", p.getLastName() != null ? p.getLastName() : "");
                map.put("bio", p.getBio() != null ? p.getBio() : "");
                map.put("experience", p.getInterests() != null ? p.getInterests() : List.of());
                map.put("skills", p.getHobbies() != null ? p.getHobbies() : List.of());
                map.put("education", p.getMusicTaste() != null ? p.getMusicTaste() : "");
                map.put("languages", p.getFoodPreference() != null ? p.getFoodPreference() : "");
                map.put("additionalCertificates", p.getTravelPreference() != null ? p.getTravelPreference() : "");
                map.put("gender", p.getGender() != null ? p.getGender() : "");
                map.put("location", p.getLocation() != null ? p.getLocation() : "");
                map.put("pictureUrl", p.getProfilePictureUrl() != null ? p.getProfilePictureUrl() : "");
                return map;
            }).orElse(null);
        }).filter(java.util.Objects::nonNull).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/dismiss/{targetId}")
    public ResponseEntity<?> dismissRecommendation(@PathVariable Long targetId, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        recommendationService.dismissUser(user, target);

        return ResponseEntity.ok(Map.of("message", "User dismissed"));
    }
}
