package web.match_me.service;

import web.match_me.entity.Profile;
import web.match_me.entity.User;
import web.match_me.repository.ProfileRepository;
import web.match_me.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Random;

@Service
public class DataSeedingService {
        // For Tests
        @Autowired
        private UserRepository userRepository;

        @Autowired
        private ProfileRepository profileRepository;

        @Autowired
        private PasswordEncoder encoder;

        private static final String[] FIRST_NAMES = { "James", "Mary", "John", "Patricia", "Robert", "Jennifer",
                        "Michael",
                        "Linda", "William", "Elizabeth" };
        private static final String[] LAST_NAMES = { "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
                        "Miller",
                        "Davis", "Rodriguez", "Martinez" };
        private static final String[] INTERESTS = { "Coding", "Hiking", "Gaming", "Cooking", "Reading", "Traveling",
                        "Music", "Art", "Sports", "Movies" };
        private static final String[] FOODS = { "Pizza", "Sushi", "Burgers", "Tacos", "Pasta", "Salad", "Steak",
                        "Seafood",
                        "Vegan", "Dessert" };
        private static final String[] MUSIC = { "Rock", "Pop", "Jazz", "Classical", "Hip Hop", "Country", "Electronic",
                        "RB", "Metal", "Folk" };
        private static final String[] TRAVEL = { "Beach", "Mountains", "City", "Countryside", "Interplanetary",
                        "Forest",
                        "Desert", "Island", "Lake", "Snow" };

        public void seedUsers(int count) {
                Random random = new Random();

                for (int i = 0; i < count; i++) {
                        String username = "user" + (i + 1);
                        String email = "user" + (i + 1) + "@example.com";

                        if (userRepository.existsByUsername(username))
                                continue;
                        if (userRepository.existsByEmail(email))
                                continue;

                        User user = new User();
                        user.setUsername(username);
                        user.setEmail(email);
                        user.setPassword(encoder.encode("password")); // Default password
                        user.setEnabled(true);
                        userRepository.save(user);

                        Profile profile = new Profile();
                        profile.setUser(user);
                        profile.setFirstName(FIRST_NAMES[random.nextInt(FIRST_NAMES.length)]);
                        profile.setLastName(LAST_NAMES[random.nextInt(LAST_NAMES.length)]);
                        profile.setBio("This is a bio for " + username);
                        profile.setGender(random.nextBoolean() ? "Male" : "Female");
                        profile.setLookingFor(random.nextBoolean() ? "Female" : "Male");

                        // Randomly select 3 interests
                        profile.setInterests(Arrays.asList(
                                        INTERESTS[random.nextInt(INTERESTS.length)],
                                        INTERESTS[random.nextInt(INTERESTS.length)],
                                        INTERESTS[random.nextInt(INTERESTS.length)]));

                        profile.setHobbies(Arrays.asList("Hobby1", "Hobby2"));
                        profile.setMusicTaste(MUSIC[random.nextInt(MUSIC.length)]);
                        profile.setFoodPreference(FOODS[random.nextInt(FOODS.length)]);
                        profile.setTravelPreference(TRAVEL[random.nextInt(TRAVEL.length)]);

                        profile.setLocation("SimCity");
                        // Random coords within range
                        double lat = 40.71 + (random.nextDouble() - 0.5);
                        double lon = -74.00 + (random.nextDouble() - 0.5);
                        profile.setLatitude(lat);
                        profile.setLongitude(lon);

                        profile.setProfilePictureUrl(
                                        "https://ui-avatars.com/api/?name=" + profile.getFirstName() + "+"
                                                        + profile.getLastName());

                        profileRepository.save(profile);
                }
                System.out.println("Seeding complete: " + count + " users created.");
        }
}
