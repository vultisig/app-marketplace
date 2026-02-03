import { Layout, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { useTheme } from "styled-components";

import { Button } from "@/toolkits/Button";
import { HStack, VStack } from "@/toolkits/Stack";
import { routeTree } from "@/utils/routes";

export const InternalErrorPage = () => {
  const navigate = useNavigate();
  const colors = useTheme();

  return (
    <VStack
      as={Layout}
      $style={{
        alignItems: "center",
        backgroundColor: colors.bgPrimary.toHex(),
        justifyContent: "center",
        height: "100%",
      }}
    >
      <Result
        status="500"
        title="Oops!"
        subTitle="Sorry, something went wrong."
        extra={
          <HStack $style={{ justifyContent: "center" }}>
            <Button onClick={() => navigate(routeTree.root.path)}>
              Back Home
            </Button>
          </HStack>
        }
      />
    </VStack>
  );
};
