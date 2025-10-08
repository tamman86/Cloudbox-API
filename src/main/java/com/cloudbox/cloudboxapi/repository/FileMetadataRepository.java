package com.cloudbox.cloudboxapi.repository;

import com.cloudbox.cloudboxapi.model.FileMetadata;
import com.cloudbox.cloudboxapi.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByUser(User user);
}
