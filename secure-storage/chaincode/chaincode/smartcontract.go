package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing file metadata
type SmartContract struct {
	contractapi.Contract
}

// FileMetadata describes the metadata of a file stored in IPFS
type FileMetadata struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	IPFSCid         string `json:"ipfsCID"`
	Size            int64  `json:"size"`
	MimeType        string `json:"mimeType"`
	EncryptionKeyId string `json:"encryptionKeyId"`
	Owner           string `json:"owner"`
	CreatedAt       string `json:"createdAt"`
	LastModified    string `json:"lastModified"`
}

// StoreFile stores file metadata in the ledger
func (s *SmartContract) StoreFile(ctx contractapi.TransactionContextInterface, metadata *FileMetadata) error {
	if metadata.ID == "" {
		return fmt.Errorf("id is required")
	}

	if metadata.Owner == "" {
		return fmt.Errorf("owner is required")
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(metadata.ID, metadataJSON)
}

// GetFile retrieves file metadata from the ledger
func (s *SmartContract) GetFile(ctx contractapi.TransactionContextInterface, id string) (*FileMetadata, error) {
	metadataJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if metadataJSON == nil {
		return nil, fmt.Errorf("the file metadata %s does not exist", id)
	}

	var metadata FileMetadata
	err = json.Unmarshal(metadataJSON, &metadata)
	if err != nil {
		return nil, err
	}

	return &metadata, nil
}

// GetAllFiles returns all file metadata stored in the ledger
func (s *SmartContract) GetAllFiles(ctx contractapi.TransactionContextInterface) ([]*FileMetadata, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var files []*FileMetadata
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var file FileMetadata
		err = json.Unmarshal(queryResponse.Value, &file)
		if err != nil {
			return nil, err
		}
		files = append(files, &file)
	}

	return files, nil
}

// UpdateFile updates an existing file's metadata in the world state
func (s *SmartContract) UpdateFile(ctx contractapi.TransactionContextInterface, metadata *FileMetadata) error {
	exists, err := s.FileExists(ctx, metadata.ID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("file %s does not exist", metadata.ID)
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(metadata.ID, metadataJSON)
}

// DeleteFile deletes a given file's metadata from the world state
func (s *SmartContract) DeleteFile(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := s.FileExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("file %s does not exist", id)
	}

	return ctx.GetStub().DelState(id)
}

// FileExists returns true when file with given ID exists in world state
func (s *SmartContract) FileExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	metadataJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return metadataJSON != nil, nil
} 