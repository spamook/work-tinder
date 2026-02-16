package web.match_me.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import web.match_me.entity.Profile;
import web.match_me.entity.User;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, Long> {
    Optional<Profile> findByUser(User user);

    Optional<Profile> findByUserId(Long userId);

    boolean existsByUser(User user);

    /**
     * Fetch candidate profiles in a single query:
     * - Same location as the current user
     * - Excluding specified user IDs (already connected, pending, dismissed)
     * - Only complete profiles (firstName not null)
     */
    @Query("SELECT p FROM Profile p WHERE p.location = :location " +
            "AND p.user.id NOT IN :excludedIds AND p.firstName IS NOT NULL")
    List<Profile> findCandidatesByLocationExcluding(
            @Param("location") String location,
            @Param("excludedIds") Set<Long> excludedIds);
}
