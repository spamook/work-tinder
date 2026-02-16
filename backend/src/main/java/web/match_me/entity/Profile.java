package web.match_me.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "profiles")
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    private String firstName;
    private String lastName;

    @Column(columnDefinition = "TEXT")
    private String bio; // About Me

    private String gender;
    
    // "Users will also need to specify what they're looking for"
    private String lookingFor; 

    // 5 Biographical Data Points
    @ElementCollection
    private List<String> interests;
    
    @ElementCollection
    private List<String> hobbies;
    
    private String musicTaste;
    
    private String foodPreference;
    
    private String travelPreference; //"Long walks" , "Pets",  "Programming"

    private String location; // City names
    private Double latitude;
    private Double longitude;

    private String profilePictureUrl;
}
