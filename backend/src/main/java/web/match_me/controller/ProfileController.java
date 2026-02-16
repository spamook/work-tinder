package web.match_me.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import web.match_me.entity.Profile;
import web.match_me.entity.User;
import web.match_me.repository.UserRepository;
import web.match_me.service.ProfileService;
import web.match_me.service.CloudinaryService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    // Helper to get picture with placeholder
    private String getPictureUrl(Profile p) {
        return p.getProfilePictureUrl() != null && !p.getProfilePictureUrl().isEmpty() ? p.getProfilePictureUrl() : "";
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserBasic(@PathVariable Long id, Authentication authentication) {
        // Note: Authentication is validated by security filter
        return profileService.getProfileByUserId(id)
                .map(profile -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("id", profile.getUser().getId());
                    response.put("name", profile.getFirstName() + " " + profile.getLastName());
                    response.put("profilePictureUrl", getPictureUrl(profile));
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/users/{id}/profile")
    public ResponseEntity<?> getUserProfile(@PathVariable Long id, Authentication authentication) {
        // "About Me" type info
        return checkVisibilityAndReturn(id, authentication, (profile) -> {
            Map<String, Object> response = new HashMap<>();
            response.put("id", profile.getUser().getId());
            response.put("aboutMe", profile.getBio());
            response.put("lookingFor", profile.getLookingFor());
            return response;
        });
    }

    @GetMapping("/users/{id}/bio")
    public ResponseEntity<?> getUserBio(@PathVariable Long id, Authentication authentication) {
        // Bio data points
        return checkVisibilityAndReturn(id, authentication, (profile) -> {
            Map<String, Object> response = new HashMap<>();
            response.put("id", profile.getUser().getId());
            response.put("gender", profile.getGender());
            response.put("interests", profile.getInterests());
            response.put("hobbies", profile.getHobbies());
            response.put("musicTaste", profile.getMusicTaste());
            response.put("foodPreference", profile.getFoodPreference());
            response.put("travelPreference", profile.getTravelPreference());
            response.put("location", profile.getLocation());
            return response;
        });
    }

    // Method allows profile viewing by anyone with the ID
    private ResponseEntity<?> checkVisibilityAndReturn(Long targetUserId, Authentication authentication,
            java.util.function.Function<Profile, Map<String, Object>> mapper) {
        User requester = userRepository.findByEmail(authentication.getName()).orElseThrow();

        if (requester.getId().equals(targetUserId)) {
            // Own profile
            return profileService.getProfileByUserId(targetUserId)
                    .map(p -> ResponseEntity.ok(mapper.apply(p)))
                    .orElse(ResponseEntity.notFound().build());
        }
        // Note: Access control commented out - if they have the ID they can view it
        return profileService.getProfileByUserId(targetUserId)
                .map(p -> ResponseEntity.ok(mapper.apply(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();

        return profileService.getProfileByUser(user)
                .map(p -> {
                    Map<String, Object> response = new HashMap<>();

                    // Basic info
                    response.put("id", user.getId());

                    response.put("firstName", p.getFirstName());
                    response.put("lastName", p.getLastName());
                    response.put("profilePictureUrl", getPictureUrl(p));

                    // profiel
                    response.put("bio", p.getBio());
                    response.put("lookingFor", p.getLookingFor());

                    // BIO
                    response.put("gender", p.getGender());
                    response.put("interests", p.getInterests());
                    response.put("hobbies", p.getHobbies());
                    response.put("musicTaste", p.getMusicTaste());
                    response.put("foodPreference", p.getFoodPreference());
                    response.put("travelPreference", p.getTravelPreference());
                    response.put("location", p.getLocation());
                    response.put("latitude", p.getLatitude());
                    response.put("longitude", p.getLongitude());

                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.ok(Map.of(
                        "id", user.getId(),
                        "name", user.getUsername(),
                        "profilePictureUrl", "",
                        "isNewUser", true // flag is profile not exists
                )));
    }

    // return my ID
    @GetMapping("/meid")
    public ResponseEntity<Long> getMeId(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return ResponseEntity.ok(user.getId());
    }

    @PostMapping("/me/photo")
    public ResponseEntity<?> uploadPhoto(@RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        try {
            String url = cloudinaryService.uploadImage(file);
            profileService.updateProfilePhotoUrl(user, url);
            return ResponseEntity.ok(Map.of("message", "Photo updated", "url", url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/me/photo")
    public ResponseEntity<?> deletePhoto(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        profileService.deleteProfilePhoto(user);
        return ResponseEntity.ok(Map.of("message", "Photo deleted"));
    }

    @GetMapping("/me/profile")
    public ResponseEntity<?> getMeProfile(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return getUserProfile(user.getId(), authentication);
    }

    @GetMapping("/me/bio")
    public ResponseEntity<?> getMeBio(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return getUserBio(user.getId(), authentication);
    }

    // If no FALSE
    @GetMapping("/users/confirmed")
    public ResponseEntity<Map<String, Boolean>> isUserConfirmed(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        boolean isConfirmed = profileService.isProfileComplete(user);

        Map<String, Boolean> response = new HashMap<>();
        response.put("isConfirmed", isConfirmed);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(Authentication authentication, @RequestBody Profile profileData) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        Profile updatedProfile = profileService.updateProfilePartially(user, profileData);
        return ResponseEntity.ok(updatedProfile);
    }
}
