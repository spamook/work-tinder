package web.match_me.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import web.match_me.entity.Connection;
import web.match_me.entity.Profile;
import web.match_me.entity.User;
import web.match_me.repository.ConnectionRepository;
import web.match_me.repository.ProfileRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

// MATCHING ENGINE
@Service
public class RecommendationService {

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private ConnectionRepository connectionRepository;

    @Autowired
    private web.match_me.repository.RecommendationDismissalRepository dismissalRepository;

    @Autowired
    private ProfileService profileService;

    public List<Long> getRecommendations(User currentUser) {
        // Profile Completion Check
        if (!profileService.isProfileComplete(currentUser)) {
            return Collections.emptyList();
        }

        Optional<Profile> currentUserProfileOpt = profileRepository.findByUser(currentUser);
        if (currentUserProfileOpt.isEmpty())
            return Collections.emptyList();
        Profile currentProfile = currentUserProfileOpt.get();

        // Need location for filtering - if no location, fall back gracefully
        String currentLocation = currentProfile.getLocation();

        // Build set of excluded user IDs
        Set<Long> excludedUserIds = new HashSet<>();
        excludedUserIds.add(currentUser.getId());

        // Exclude ACCEPTED connections (already friends)
        List<Connection> connections = connectionRepository.findAllAcceptedConnections(currentUser);
        for (Connection c : connections) {
            User partner = c.getRequester().equals(currentUser) ? c.getReceiver() : c.getRequester();
            excludedUserIds.add(partner.getId());
        }

        // Exclude PENDING requests received (those who already sent YOU a request)
        List<Connection> pending = connectionRepository.findByReceiverAndStatus(currentUser,
                Connection.ConnectionStatus.PENDING);
        for (Connection c : pending)
            excludedUserIds.add(c.getRequester().getId());

        // Exclude recently dismissed users (within last 7 days)
        List<web.match_me.entity.RecommendationDismissal> dismissed = dismissalRepository.findByUser(currentUser);
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusWeeks(1);
        for (web.match_me.entity.RecommendationDismissal d : dismissed) {
            if (d.getDismissedAt().isAfter(oneWeekAgo)) {
                excludedUserIds.add(d.getDismissedUser().getId());
            }
        }

        // OPTIMIZED: Single batch query with location filtering
        // Fetches only profiles in the same town, excluding already processed users
        List<Profile> candidateProfiles;
        if (currentLocation != null && !currentLocation.isBlank()) {
            candidateProfiles = profileRepository.findCandidatesByLocationExcluding(
                    currentLocation, excludedUserIds);
        } else {
            // Fallback: if no location, return empty (or could query all - but that defeats
            // optimization)
            return Collections.emptyList();
        }

        // Score the candidates (no additional DB queries needed - profiles already
        // loaded)
        List<UserProfileScore> scoredUsers = new ArrayList<>();
        for (Profile otherProfile : candidateProfiles) {
            double score = calculateScore(currentProfile, otherProfile);
            // Minimum score threshold to avoid weak recommendations
            if (score > 5) {
                scoredUsers.add(new UserProfileScore(otherProfile.getUser().getId(), score));
            }
        }

        // Sort by score descending, limit to 10, return user IDs
        List<Long> results = scoredUsers.stream()
                .sorted(Comparator.comparingDouble(UserProfileScore::getScore).reversed())
                .limit(10)
                .map(UserProfileScore::getUserId)
                .collect(Collectors.toList());

        return results;
    }

    // Здесь НУЖНО ПОМЕНЯТЬ ибо тут навсегда полсе отклонения человек пропадает
    // вообще
    public void dismissUser(User user, User userToDismiss) {
        Optional<web.match_me.entity.RecommendationDismissal> existing = dismissalRepository
                .findByUserAndDismissedUser(user, userToDismiss);

        web.match_me.entity.RecommendationDismissal dismissal;
        if (existing.isPresent()) {
            dismissal = existing.get();
        } else {
            dismissal = new web.match_me.entity.RecommendationDismissal();
            dismissal.setUser(user);
            dismissal.setDismissedUser(userToDismiss);
        }

        dismissal.setDismissedAt(java.time.LocalDateTime.now());
        dismissalRepository.save(dismissal);
    }

    // САМ СЕРВИС РЕКОМЕНДАЦИЙ
    private double calculateScore(Profile p1, Profile p2) {
        double score = 0;
        // Для каждого типа есть свой СЧЕТ то есть для exp и skills дается по 10
        // А для музыки и прочего по 5 , тем самым создается более реальный MATCHING ,
        // иначе он будет удроченным

        // 1 EXPERIENCE (List)
        score += calculateListOverlap(p1.getInterests(), p2.getInterests()) * 10;

        // 2 SKILLS (List)
        score += calculateListOverlap(p1.getHobbies(), p2.getHobbies()) * 10;

        // 3 EDUCATION (String matching)
        if (isMatch(p1.getMusicTaste(), p2.getMusicTaste()))
            score += 5;

        // 4 LANGUAGES
        if (isMatch(p1.getFoodPreference(), p2.getFoodPreference()))
            score += 5;

        // 5 ADITTIONAL CERTIFICATES
        if (isMatch(p1.getTravelPreference(), p2.getTravelPreference()))
            score += 5;

        // Location Proximity , тупо СЧЕТ ведет по расстоянию , ЧЕМ ближе тем больше
        // СЧЕТ
        if (p1.getLatitude() != null && p2.getLatitude() != null) {
            double dist = calculateDistance(p1.getLatitude(), p1.getLongitude(), p2.getLatitude(), p2.getLongitude());
            if (dist < 10)
                score += 50; // Very close
            else if (dist < 50)
                score += 20; // Close-ish
        }

        // Looking For match? (A seeking B, B seeking A) - Optional extra logic

        return score;
    }

    // "retainALL" назодит общие элементы в списках
    // например если у вас обоих SKILLS "Java" i "Football" дает 20+ баллов
    private int calculateListOverlap(List<String> l1, List<String> l2) {
        if (l1 == null || l2 == null)
            return 0;
        Set<String> s1 = new HashSet<>(l1);
        s1.retainAll(l2);
        return s1.size();
    }

    private boolean isMatch(String s1, String s2) {
        return s1 != null && s2 != null && s1.equalsIgnoreCase(s2);
    }

    // AI Математика расстояния (метод calculateDistance) использует сферический
    // закон косинусов для
    // перевода координат (широта/долгота) в километры
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        // Haversine or simple spherical law (moved from previous impl)
        double theta = lon1 - lon2;
        double dist = Math.sin(Math.toRadians(lat1)) * Math.sin(Math.toRadians(lat2))
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.cos(Math.toRadians(theta));
        dist = Math.acos(dist);
        dist = Math.toDegrees(dist);
        dist = dist * 60 * 1.1515 * 1.609344;
        return dist;
    }

    private static class UserProfileScore {
        private Long userId;
        private double score;

        public UserProfileScore(Long userId, double score) {
            this.userId = userId;
            this.score = score;
        }

        public Long getUserId() {
            return userId;
        }

        public double getScore() {
            return score;
        }
    }
}
