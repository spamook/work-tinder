package web.match_me.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import web.match_me.entity.RecommendationDismissal;
import web.match_me.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecommendationDismissalRepository extends JpaRepository<RecommendationDismissal, Long> {
    List<RecommendationDismissal> findByUser(User user);

    Optional<RecommendationDismissal> findByUserAndDismissedUser(User user, User dismissedUser);
}
