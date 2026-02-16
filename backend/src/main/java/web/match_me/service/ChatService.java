package web.match_me.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import web.match_me.entity.ChatMessage;
import web.match_me.entity.User;
import web.match_me.repository.ChatMessageRepository;
import web.match_me.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatService {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    public ChatMessage saveMessage(Long senderId, Long receiverId, String content) {
        User sender = userRepository.findById(senderId).orElseThrow();
        User receiver = userRepository.findById(receiverId).orElseThrow();

        ChatMessage message = new ChatMessage();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now());
        message.setRead(false);

        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getChatHistory(User user1, Long user2Id) {
        User user2 = userRepository.findById(user2Id).orElseThrow();
        return chatMessageRepository.findChatHistory(user1, user2);
    }

    public org.springframework.data.domain.Page<ChatMessage> getChatHistoryPaged(User user1, Long user2Id, int page,
            int size) {
        User user2 = userRepository.findById(user2Id).orElseThrow();
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return chatMessageRepository.findChatHistoryPaged(user1, user2, pageable);
    }

    public void markMessagesAsRead(User receiver, Long senderId) {
        User sender = userRepository.findById(senderId).orElseThrow();
        List<ChatMessage> history = chatMessageRepository.findChatHistory(sender, receiver);
        for (ChatMessage msg : history) {
            if (msg.getReceiver().equals(receiver) && !msg.isRead()) {
                msg.setRead(true);
                chatMessageRepository.save(msg);
            }
        }
    }
}
