import { Layout, Result } from "antd";
import { useTheme } from "styled-components";

import { useGoBack } from "@/hooks/useGoBack";
import { Button } from "@/toolkits/Button";
import { HStack, VStack } from "@/toolkits/Stack";
import { routeTree } from "@/utils/routes";

export const InternalErrorPage = () => {
  const goBack = useGoBack();
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
            <Button onClick={() => goBack(routeTree.root.path)}>
              Back Home
            </Button>
          </HStack>
        }
      />
    </VStack>
  );
};
