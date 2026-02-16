package web.match_me.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;
import web.match_me.entity.ChatMessage;
import web.match_me.entity.User;
import web.match_me.repository.UserRepository;
import web.match_me.service.ChatService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private web.match_me.service.ConnectionService connectionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private web.match_me.repository.ChatMessageRepository chatMessageRepository;

    // REST Endpoint: Send Message
    @org.springframework.web.bind.annotation.PostMapping("/messages/send")
    @ResponseBody
    public ResponseEntity<?> sendMessage(
            @org.springframework.web.bind.annotation.RequestBody ChatMessageDto chatMessageDto,
            Authentication authentication) {
        User sender = userRepository.findByEmail(authentication.getName()).orElseThrow();
        User receiver = userRepository.findById(chatMessageDto.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        if (!connectionService.areConnected(sender, receiver)) {
            return ResponseEntity.status(403).body(Map.of("error", "You can only message connected users"));
        }

        ChatMessage saved = chatService.saveMessage(
                sender.getId(),
                chatMessageDto.getReceiverId(),
                chatMessageDto.getContent());

        // Convert LocalDateTime to array format [year, month, day, hour, minute,
        // second, nano]
        // This matches what Jackson serializes for REST endpoints
        java.time.LocalDateTime ts = saved.getTimestamp();
        int[] timestampArray = new int[] {
                ts.getYear(), ts.getMonthValue(), ts.getDayOfMonth(),
                ts.getHour(), ts.getMinute(), ts.getSecond(), ts.getNano()
        };

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("senderId", saved.getSender().getId());
        response.put("receiverId", saved.getReceiver().getId());
        response.put("content", saved.getContent());
        response.put("timestamp", timestampArray);

        // Broadcast to receiver via WebSocket
        messagingTemplate.convertAndSend(
                "/queue/messages-user" + saved.getReceiver().getId(),
                response);

        return ResponseEntity.ok(Map.of("message", "Sent successfully", "data", response));
    }

    // REST Endpoint: Send Typing Indicator
    @org.springframework.web.bind.annotation.PostMapping("/messages/typing")
    @ResponseBody
    public ResponseEntity<?> sendTypingIndicator(
            @org.springframework.web.bind.annotation.RequestBody TypingIndicatorDto dto,
            Authentication authentication) {
        User sender = userRepository.findByEmail(authentication.getName()).orElseThrow();
        User receiver = userRepository.findById(dto.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        if (!connectionService.areConnected(sender, receiver)) {
            return ResponseEntity.status(403).body(Map.of("error", "Not connected"));
        }

        Map<String, Object> typingEvent = new HashMap<>();
        typingEvent.put("senderId", sender.getId());
        typingEvent.put("isTyping", true);

        messagingTemplate.convertAndSend(
                "/queue/typing-user" + receiver.getId(),
                typingEvent);

        return ResponseEntity.ok(Map.of("success", true));
    }

    // REST Endpoint: Get History
    // REST Endpoint: Get History
    @GetMapping("/messages/{userId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getChatHistory(
            @PathVariable Long userId,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName()).orElseThrow();

        org.springframework.data.domain.Page<ChatMessage> chatPage = chatService.getChatHistoryPaged(currentUser,
                userId, page, size);
        List<ChatMessage> history = chatPage.getContent();

        // Convert to DTOs
        List<Map<String, Object>> messages = history.stream().map(msg -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", msg.getId());
            map.put("senderId", msg.getSender().getId());
            map.put("receiverId", msg.getReceiver().getId());
            map.put("content", msg.getContent());
            map.put("timestamp", msg.getTimestamp());
            map.put("read", msg.isRead());
            return map;
        }).collect(Collectors.toList());

        // Reverse to chronological order (oldest -> newest) for display
        java.util.Collections.reverse(messages);

        Map<String, Object> response = new HashMap<>();
        response.put("messages", messages);
        response.put("startOfChatReached", chatPage.isLast());
        // Note: isLast() is true if the current slice is the last one.
        // If total elements = 0, isLast() is true.
        // If total elements < size, isLast() is true.

        return ResponseEntity.ok(response);
    }

    // DTO class
    public static class ChatMessageDto {
        private Long senderId;
        private Long receiverId;
        private String content;

        // Getters/Setters
        public Long getSenderId() {
            return senderId;
        }

        public void setSenderId(Long senderId) {
            this.senderId = senderId;
        }

        public Long getReceiverId() {
            return receiverId;
        }

        public void setReceiverId(Long receiverId) {
            this.receiverId = receiverId;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }

    // DTO for typing indicator
    public static class TypingIndicatorDto {
        private Long receiverId;

        public Long getReceiverId() {
            return receiverId;
        }

        public void setReceiverId(Long receiverId) {
            this.receiverId = receiverId;
        }
    }

    // REST Endpoint: Mark messages as read
    @org.springframework.web.bind.annotation.PostMapping("/messages/read/{senderId}")
    @ResponseBody
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> markMessagesAsRead(@PathVariable Long senderId, Authentication authentication) {
        User receiver = userRepository.findByEmail(authentication.getName()).orElseThrow();
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        chatMessageRepository.markMessagesAsRead(receiver, sender);

        // Notify myself (other tabs/devices) to clear badges
        messagingTemplate.convertAndSend(
                "/queue/messages-read-user" + receiver.getId(),
                Map.of("senderId", sender.getId()));

        return ResponseEntity.ok(Map.of("success", true));
    }
}
