package main

import (
    "fmt"

    "github.com/hyperledger/fabric-samples/secure-storage/chaincode/chaincode"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func main() {
    chaincode, err := contractapi.NewChaincode(&chaincode.SmartContract{})
    if err != nil {
        fmt.Printf("Error creating filestore chaincode: %v", err)
        return
    }

    if err := chaincode.Start(); err != nil {
        fmt.Printf("Error starting filestore chaincode: %v", err)
    }
} 