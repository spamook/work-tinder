package web.match_me;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ChatSimulation {

    private static final String BASE_URL = "http://localhost:8080";
    private static final String PASSWORD = "password";
    // Adjust these based on your seeded data
    private static final String[] USERS = {
            "alice@example.com",
            "bob@example.com",
            "charlie@example.com",
            "diana@example.com",
            "eve@example.com",
            "frank@example.com"
    };

    private static final HttpClient client = HttpClient.newHttpClient();
    private static final ObjectMapper mapper = new ObjectMapper();

    private static final Map<String, String> tokens = new HashMap<>();
    private static final Map<String, Long> userIds = new HashMap<>();

    public static void main(String[] args) {
        try {
            System.out.println("Starting Chat Simulation...");

            // 1. Authenticate all users
            for (String email : USERS) {
                String token = login(email);
                if (token != null) {
                    tokens.put(email, token);
                    Long id = getMe(token);
                    if (id != null) {
                        userIds.put(email, id);
                        System.out.println("Logged in: " + email + " (ID: " + id + ")");
                    }
                } else {
                    System.err.println("Failed to login: " + email);
                }
            }

            if (userIds.size() < 2) {
                System.err.println("Not enough users logged in. Have you run data seeding?");
                return;
            }

            String mainUser = USERS[0];
            String mainToken = tokens.get(mainUser);
            Long mainId = userIds.get(mainUser);

            // 2. Main User sends messages to everyone else
            System.out.println("\n--- Phase 1: Main User Broadcasting ---");
            for (int i = 1; i < USERS.length; i++) {
                String targetEmail = USERS[i];
                if (userIds.containsKey(targetEmail)) {
                    Long targetId = userIds.get(targetEmail);
                    String msg = "Hello " + targetEmail + ", are you there?";
                    sendMessage(mainToken, targetId, msg);
                    Thread.sleep(500);
                }
            }

            // 3. Others reply
            System.out.println("\n--- Phase 2: Responders Replying ---");
            for (int i = 1; i < USERS.length; i++) {
                String responderEmail = USERS[i];
                if (tokens.containsKey(responderEmail)) {
                    String responderToken = tokens.get(responderEmail);
                    String reply = "Yes, " + mainUser + ", I am here! (from " + responderEmail + ")";
                    sendMessage(responderToken, mainId, reply);
                    Thread.sleep(500);
                }
            }

            // 4. Check Interactions
            System.out.println("\n--- Phase 3: Verifying Chat History (Main User Perspective) ---");
            for (int i = 1; i < USERS.length; i++) {
                String targetEmail = USERS[i];
                if (userIds.containsKey(targetEmail)) {
                    Long targetId = userIds.get(targetEmail);
                    List<Map<String, Object>> history = getHistory(mainToken, targetId);

                    System.out.println("\nHistory with " + targetEmail + ":");
                    for (Map<String, Object> msg : history) {
                        Object senderIdObj = msg.get("senderId");
                        // Handle potential Integer/Long types from JSON
                        Long senderId = ((Number) senderIdObj).longValue();

                        String senderName = senderId.equals(mainId) ? "ME" : "THEM";
                        System.out.println(
                                String.format("[%s] %s: %s", msg.get("timestamp"), senderName, msg.get("content")));
                    }
                }
            }

            System.out.println("\nSimulation Complete.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static String login(String email) throws Exception {
        Map<String, String> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", PASSWORD);

        String json = mapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/signin"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            Map<String, String> map = mapper.readValue(response.body(), new TypeReference<>() {
            });
            return map.get("token");
        }
        return null;
    }

    private static Long getMe(String token) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/me"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            Map<String, Object> map = mapper.readValue(response.body(), new TypeReference<>() {
            });
            return ((Number) map.get("id")).longValue();
        }
        return null;
    }

    private static void sendMessage(String token, Long receiverId, String content) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("receiverId", receiverId);
        payload.put("content", content);

        String json = mapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/messages/send"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            System.out.println("Sent message to ID " + receiverId);
        } else {
            System.err.println("Error sending message: " + response.statusCode() + " " + response.body());
        }
    }

    private static List<Map<String, Object>> getHistory(String token, Long otherUserId) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/messages/" + otherUserId))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            return mapper.readValue(response.body(), new TypeReference<>() {
            });
        }
        return List.of();
    }
}
