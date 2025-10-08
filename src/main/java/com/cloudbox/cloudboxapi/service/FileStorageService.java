package com.cloudbox.cloudboxapi.service;

import com.cloudbox.cloudboxapi.model.FileMetadata;
import com.cloudbox.cloudboxapi.model.User;
import com.cloudbox.cloudboxapi.repository.FileMetadataRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class FileStorageService {

    private final S3Client s3Client;
    private final String bucketName;
    private final FileMetadataRepository fileMetadataRepository;

    public FileStorageService(@Value("${aws.accessKeyId}") String accessKey,
                              @Value("${aws.secretKey}") String secretKey,
                              @Value("${aws.region}") String region,
                              @Value("${aws.s3.bucketName}") String bucketName,
                              FileMetadataRepository fileMetadataRepository) {
        this.bucketName = bucketName;
        this.fileMetadataRepository = fileMetadataRepository;
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new IllegalStateException("Could not determine the current user.");
    }

    public void store(MultipartFile file) {
        User currentUser = getCurrentUser();
        try {
            // Upload file to S3
            String fileName = file.getOriginalFilename();
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(this.bucketName)
                    .key(fileName)
                    .build();
            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Save metadata to database
            FileMetadata metadata = new FileMetadata();
            metadata.setFileName(fileName);
            metadata.setS3Key(fileName);
            metadata.setFileSize(file.getSize());
            metadata.setUploadTimestamp(LocalDateTime.now());
            metadata.setUser(currentUser);
            fileMetadataRepository.save(metadata);

        } catch (IOException e) {
            throw new RuntimeException("Could not store the file. Error: " + e.getMessage());
        }
    }

    public Resource load(String filename) {
        User currentUser = getCurrentUser();
        FileMetadata metadata = fileMetadataRepository.findByUser(currentUser).stream()
                .filter(m -> m.getFileName().equals(filename))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("File not found or you don't have permission: " + filename));

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(this.bucketName)
                .key(metadata.getS3Key())
                .build();
        ResponseInputStream<GetObjectResponse> s3object = s3Client.getObject(getObjectRequest);
        return new InputStreamResource(s3object);
    }

    public List<FileMetadata> loadAll() {
        User currentUser = getCurrentUser();
        // Get files for the current user only
        return fileMetadataRepository.findByUser(currentUser);
    }

    public void delete(Long id) {
        User currentUser = getCurrentUser();
        // Look for metadata in the database
        FileMetadata metadata = fileMetadataRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + id));

        // Check the file belongs to the current user
        if (!metadata.getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("User does not have permission to delete this file.");
        }

        // Generate delete request
        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(this.bucketName)
                .key(metadata.getS3Key())
                .build();

        // Delete file from S3
        s3Client.deleteObject(deleteObjectRequest);

        // Delete metadata from database
        fileMetadataRepository.deleteById(id);
    }
}