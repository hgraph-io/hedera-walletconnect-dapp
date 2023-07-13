import * as React from "react";

import Loader from "../components/Loader";
import { SContainer, STable, SRow, SKey, SValue } from "../components/shared";

import { SModalContainer, SModalTitle, SModalParagraph } from "./shared";

interface RequestModalProps {
  pending: boolean;
  result: any;
}

const RequestModal = (props: RequestModalProps) => {
  const { pending, result } = props;
  return (
    <>
      {pending ? (
        <SModalContainer>
          <SModalTitle>{"Pending Request"}</SModalTitle>
          <SContainer>
            <Loader />
            <SModalParagraph>
              {"Approve or reject request using your wallet"}
            </SModalParagraph>
          </SContainer>
        </SModalContainer>
      ) : result ? (
        <SModalContainer>
          <SModalTitle>
            {result.valid ? "Request Approved" : "Request Failed"}
          </SModalTitle>
          <STable>
            {Object.keys(result).map((key) => (
              <SRow key={key}>
                <SKey>{key}</SKey>
                <SValue>{result[key].toString()}</SValue>
              </SRow>
            ))}
          </STable>
        </SModalContainer>
      ) : (
        <SModalContainer>
          <SModalTitle>{"Request Rejected"}</SModalTitle>
        </SModalContainer>
      )}
    </>
  );
};

export default RequestModal;
