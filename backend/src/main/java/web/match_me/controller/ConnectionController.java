package web.match_me.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import web.match_me.entity.Connection;
import web.match_me.entity.User;
import web.match_me.repository.UserRepository;
import web.match_me.service.ConnectionService;
import web.match_me.repository.ChatMessageRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/connections")
public class ConnectionController {

    @Autowired
    private ConnectionService connectionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private web.match_me.repository.ProfileRepository profileRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private web.match_me.service.PresenceService presenceService;

    // Send Request
    @PostMapping("/request/{targetUserId}")
    public ResponseEntity<?> sendRequest(@PathVariable Long targetUserId, Authentication authentication) {
        User requester = userRepository.findByEmail(authentication.getName()).orElseThrow();
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            Connection c = connectionService.sendConnectionRequest(requester, target);
            return ResponseEntity.ok(Map.of("message", "Request sent", "id", c.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Accept Request
    @PostMapping("/accept/{connectionId}")
    public ResponseEntity<?> acceptRequest(@PathVariable Long connectionId, Authentication authentication) {
        User receiver = userRepository.findByEmail(authentication.getName()).orElseThrow();
        try {
            connectionService.acceptConnectionRequest(connectionId, receiver);
            return ResponseEntity.ok(Map.of("message", "Connection accepted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Reject Request
    @PostMapping("/reject/{connectionId}")
    public ResponseEntity<?> rejectRequest(@PathVariable Long connectionId, Authentication authentication) {
        User receiver = userRepository.findByEmail(authentication.getName()).orElseThrow();
        try {
            connectionService.rejectConnectionRequest(connectionId, receiver);
            return ResponseEntity.ok(Map.of("message", "Request rejected"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Disconnect
    @DeleteMapping("/{connectionId}")
    public ResponseEntity<?> disconnect(@PathVariable Long connectionId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        try {
            connectionService.disconnect(connectionId, user);
            return ResponseEntity.ok(Map.of("message", "Disconnected"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Get My Requests (Incoming)
    @GetMapping("/requests")
    public ResponseEntity<List<Map<String, Object>>> getPendingRequests(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<Connection> requests = connectionService.getPendingRequests(user);

        List<Map<String, Object>> response = requests.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("connectionId", c.getId());
            map.put("requesterId", c.getRequester().getId());

            profileRepository.findByUser(c.getRequester()).ifPresent(profile -> {
                String displayName = profile.getFirstName() != null && !profile.getFirstName().isEmpty()
                        ? profile.getFirstName()
                        : c.getRequester().getUsername();
                map.put("requesterName", displayName);
                map.put("requesterLastName", profile.getLastName() != null ? profile.getLastName() : "");
                map.put("bio", profile.getBio() != null ? profile.getBio() : "");
                map.put("experience", profile.getInterests() != null ? profile.getInterests() : List.of());
                map.put("skills", profile.getHobbies() != null ? profile.getHobbies() : List.of());
                map.put("education", profile.getMusicTaste() != null ? profile.getMusicTaste() : "");
                map.put("languages", profile.getFoodPreference() != null ? profile.getFoodPreference() : "");
                map.put("additionalCertificates",
                        profile.getTravelPreference() != null ? profile.getTravelPreference() : "");
                map.put("gender", profile.getGender() != null ? profile.getGender() : "");
                map.put("location", profile.getLocation() != null ? profile.getLocation() : "");
                map.put("profilePictureUrl",
                        profile.getProfilePictureUrl() != null ? profile.getProfilePictureUrl() : "");
            });

            // If profile not found, set default values
            if (!map.containsKey("requesterName")) {
                map.put("requesterName", c.getRequester().getUsername());
                map.put("requesterLastName", "");
                map.put("bio", "");
                map.put("experience", List.of());
                map.put("skills", List.of());
                map.put("education", "");
                map.put("languages", "");
                map.put("additionalCertificates", "");
                map.put("gender", "");
                map.put("location", "");
                map.put("profilePictureUrl", "");
            }

            map.put("sentAt", c.getCreatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Get My Connections (Accepted)
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getConnections(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<Connection> connections = connectionService.getMyConnections(user);

        List<Map<String, Object>> response = connections.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("connectionId", c.getId());
            User partner = c.getRequester().equals(user) ? c.getReceiver() : c.getRequester();
            map.put("userId", partner.getId());

            profileRepository.findByUser(partner).ifPresent(profile -> {
                String displayName = profile.getFirstName() != null && !profile.getFirstName().isEmpty()
                        ? profile.getFirstName()
                        : partner.getUsername();
                map.put("username", displayName);
                map.put("lastName", profile.getLastName() != null ? profile.getLastName() : "");
                map.put("bio", profile.getBio() != null ? profile.getBio() : "");
                map.put("experience", profile.getInterests() != null ? profile.getInterests() : List.of());
                map.put("skills", profile.getHobbies() != null ? profile.getHobbies() : List.of());
                map.put("education", profile.getMusicTaste() != null ? profile.getMusicTaste() : "");
                map.put("languages", profile.getFoodPreference() != null ? profile.getFoodPreference() : "");
                map.put("additionalCertificates",
                        profile.getTravelPreference() != null ? profile.getTravelPreference() : "");
                map.put("gender", profile.getGender() != null ? profile.getGender() : "");
                map.put("location", profile.getLocation() != null ? profile.getLocation() : "");
                map.put("profilePictureUrl",
                        profile.getProfilePictureUrl() != null ? profile.getProfilePictureUrl() : "");
            });

            // If profile not found, set default values
            if (!map.containsKey("username")) {
                map.put("username", partner.getUsername());
                map.put("lastName", "");
                map.put("bio", "");
                map.put("experience", List.of());
                map.put("skills", List.of());
                map.put("education", "");
                map.put("languages", "");
                map.put("additionalCertificates", "");
                map.put("gender", "");
                map.put("location", "");
                map.put("profilePictureUrl", "");
            }

            map.put("connectedAt", c.getCreatedAt());

            // Add last message timestamp if any messages exist
            chatMessageRepository.findLastMessageTimestamp(user, partner)
                    .ifPresentOrElse(
                            timestamp -> map.put("lastMessageSentAt", timestamp),
                            () -> map.put("lastMessageSentAt", null));

            // Add unread count
            long unreadCount = chatMessageRepository.countByReceiverAndSenderAndIsReadFalse(user, partner);
            map.put("unreadCount", unreadCount);

            // Add online status
            map.put("isOnline", presenceService.isUserOnline(partner.getId()));

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}
