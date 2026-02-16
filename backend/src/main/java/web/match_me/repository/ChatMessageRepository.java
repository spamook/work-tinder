package web.match_me.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import web.match_me.entity.ChatMessage;
import web.match_me.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Find chat history between two users (Legacy - full history)
    @Query("SELECT m FROM ChatMessage m WHERE (m.sender = :user1 AND m.receiver = :user2) OR (m.sender = :user2 AND m.receiver = :user1) ORDER BY m.timestamp ASC")
    List<ChatMessage> findChatHistory(@Param("user1") User user1, @Param("user2") User user2);

    // Find chat history between two users (Paged - latest first)
    // Note: We order by timestamp DESC to get the *latest* messages first.
    @Query("SELECT m FROM ChatMessage m WHERE (m.sender = :user1 AND m.receiver = :user2) OR (m.sender = :user2 AND m.receiver = :user1) ORDER BY m.timestamp DESC")
    org.springframework.data.domain.Page<ChatMessage> findChatHistoryPaged(@Param("user1") User user1,
            @Param("user2") User user2, org.springframework.data.domain.Pageable pageable);

    // Find unread count
    long countByReceiverAndIsReadFalse(User receiver);

    // Find unread count per sender
    long countByReceiverAndSenderAndIsReadFalse(User receiver, User sender);

    // Mark messages as read
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.receiver = :receiver AND m.sender = :sender AND m.isRead = false")
    void markMessagesAsRead(@Param("receiver") User receiver, @Param("sender") User sender);

    // Find the most recent message timestamp between two users
    @Query("SELECT m.timestamp FROM ChatMessage m WHERE (m.sender = :user1 AND m.receiver = :user2) OR (m.sender = :user2 AND m.receiver = :user1) ORDER BY m.timestamp DESC LIMIT 1")
    Optional<LocalDateTime> findLastMessageTimestamp(@Param("user1") User user1, @Param("user2") User user2);
}
