package web.match_me.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import web.match_me.entity.Profile;
import web.match_me.entity.User;
import web.match_me.repository.ProfileRepository;
import web.match_me.repository.UserRepository;

import java.util.Optional;
// RULES FOR PROFILE
@Service
public class ProfileService {

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private UserRepository userRepository;

    public Profile saveProfile(Profile profile) {
        return profileRepository.save(profile);
    }

    public Optional<Profile> getProfileByUser(User user) {
        return profileRepository.findByUser(user);
    }

    public Optional<Profile> getProfileByUserId(Long userId) {
        return profileRepository.findByUserId(userId);
    }
    
    public boolean isProfileComplete(User user) {
        return user.isProfileCompleted();
    }
// Searching if profile exsits if yes update , if no then  creating new one
    public Profile createOrUpdateProfile(User user, Profile newProfileData) {
        Profile profile = profileRepository.findByUser(user)
                .orElse(new Profile());
        // mathcing data
        profile.setUser(user);
        profile.setFirstName(newProfileData.getFirstName());
        profile.setLastName(newProfileData.getLastName());
        profile.setBio(newProfileData.getBio());
        profile.setGender(newProfileData.getGender());
        profile.setLookingFor(newProfileData.getLookingFor());
        
        profile.setInterests(newProfileData.getInterests());
        profile.setHobbies(newProfileData.getHobbies());
        profile.setMusicTaste(newProfileData.getMusicTaste());
        profile.setFoodPreference(newProfileData.getFoodPreference());
        profile.setTravelPreference(newProfileData.getTravelPreference());
        
        profile.setLocation(newProfileData.getLocation());
        profile.setLatitude(newProfileData.getLatitude());
        profile.setLongitude(newProfileData.getLongitude());
        profile.setProfilePictureUrl(newProfileData.getProfilePictureUrl());

        // Check completion (5 data points + basic info)
        boolean isComplete = 
            (profile.getFirstName() != null && !profile.getFirstName().isEmpty()) &&
            (profile.getLookingFor() != null && !profile.getLookingFor().isEmpty()) &&
            (profile.getInterests() != null && !profile.getInterests().isEmpty()) &&
            (profile.getHobbies() != null && !profile.getHobbies().isEmpty()) &&
            (profile.getMusicTaste() != null && !profile.getMusicTaste().isEmpty()) &&
            (profile.getFoodPreference() != null && !profile.getFoodPreference().isEmpty()) &&
            (profile.getTravelPreference() != null && !profile.getTravelPreference().isEmpty());
            
        user.setProfileCompleted(isComplete);
        userRepository.save(user);

        return profileRepository.save(profile);
    }
    
    public Profile updateProfilePartially(User user, Profile partialData) {
        Profile profile = profileRepository.findByUser(user).orElse(new Profile());
        profile.setUser(user);

        if (partialData.getFirstName() != null) profile.setFirstName(partialData.getFirstName());
        if (partialData.getLastName() != null) profile.setLastName(partialData.getLastName());
        if (partialData.getBio() != null) profile.setBio(partialData.getBio());
        if (partialData.getGender() != null) profile.setGender(partialData.getGender());
        if (partialData.getLookingFor() != null) profile.setLookingFor(partialData.getLookingFor());
        
        if (partialData.getInterests() != null) profile.setInterests(partialData.getInterests());
        if (partialData.getHobbies() != null) profile.setHobbies(partialData.getHobbies());
        if (partialData.getMusicTaste() != null) profile.setMusicTaste(partialData.getMusicTaste());
        if (partialData.getFoodPreference() != null) profile.setFoodPreference(partialData.getFoodPreference());
        if (partialData.getTravelPreference() != null) profile.setTravelPreference(partialData.getTravelPreference());
        
        if (partialData.getLocation() != null) profile.setLocation(partialData.getLocation());
        if (partialData.getLatitude() != null) profile.setLatitude(partialData.getLatitude());
        if (partialData.getLongitude() != null) profile.setLongitude(partialData.getLongitude());
        if (partialData.getProfilePictureUrl() != null) profile.setProfilePictureUrl(partialData.getProfilePictureUrl());
        
        // Re-check completion
        boolean isComplete = 
            (profile.getFirstName() != null && !profile.getFirstName().isEmpty()) &&
            (profile.getLookingFor() != null && !profile.getLookingFor().isEmpty()) &&
            (profile.getInterests() != null && !profile.getInterests().isEmpty()) &&
            (profile.getHobbies() != null && !profile.getHobbies().isEmpty()) &&
            (profile.getMusicTaste() != null && !profile.getMusicTaste().isEmpty()) &&
            (profile.getFoodPreference() != null && !profile.getFoodPreference().isEmpty()) &&
            (profile.getTravelPreference() != null && !profile.getTravelPreference().isEmpty());
            
        user.setProfileCompleted(isComplete);
        userRepository.save(user);

        return profileRepository.save(profile);
    }
    public void updateProfilePhotoUrl(User user, String photoUrl) {
        Profile profile = profileRepository.findByUser(user).orElse(new Profile());
        profile.setUser(user);
        profile.setProfilePictureUrl(photoUrl);
        profileRepository.save(profile);
    }
    
    public void deleteProfilePhoto(User user) {
        Profile profile = profileRepository.findByUser(user).orElseThrow(() -> new RuntimeException("Profile not found"));
        profile.setProfilePictureUrl(""); // Just clear URL, keeping file for now or delete if strict
        profileRepository.save(profile);
    }
}
