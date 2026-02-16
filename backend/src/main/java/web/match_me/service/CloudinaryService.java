package web.match_me.service;

import com.cloudinary.Cloudinary;
import java.io.IOException;
import java.util.Map;

import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;

import org.springframework.web.multipart.MultipartFile;
// Этот сервис берет байты и через интернет отправляет их на севервы Cloudinary

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    // Пользователь нажимает *Загрузить* файл в виде потока байтов и попадает сюда
    @SuppressWarnings("unchecked")
    public String uploadImage(MultipartFile file) {
        try {
            // Благодоря команде ниже ЛОКАЛЬНАЯ КОПИЯ НЕ СОЗДАЕТСЯ!!!
            Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            return uploadResult.get("url").toString(); // Возвращает прямую ссылку на фото
        } catch (IOException e) {
            throw new RuntimeException("Ошибка при загрузке фото в Cloudinary", e);
        }
    }
}