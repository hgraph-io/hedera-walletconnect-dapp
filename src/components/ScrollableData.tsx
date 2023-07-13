import styled from "styled-components";
import { colors } from "../styles";

const SScrollableArea = styled.div`
  max-height: 400px;
  overflow: scroll;
  background: rgba(${colors.lightGrey}, 0.5);
  padding: 8px;
  border-radius: 4px;
`;

const PreformattedData = styled.pre`
  margin: 0px;
`;

type ScrollableDataProps = {
  data: string;
};

/**
 * If `data` is valid JSON, format it and return an element with scrollable overflow.
 * If `data` is just a regular string, simply return the string as a fragment.
 */
export default function ScrollableData({ data }: ScrollableDataProps) {
  try {
    return (
      <SScrollableArea>
        <PreformattedData>
          {JSON.stringify(JSON.parse(data), null, 2)}
        </PreformattedData>
      </SScrollableArea>
    );
  } catch {
    return <>{data}</>;
  }
}
