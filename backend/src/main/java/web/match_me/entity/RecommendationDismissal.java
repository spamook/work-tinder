package web.match_me.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "recommendation_dismissals", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "dismissed_user_id"})
})
public class RecommendationDismissal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "dismissed_user_id", nullable = false)
    private User dismissedUser;

    private LocalDateTime dismissedAt;
}
