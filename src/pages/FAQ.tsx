import { Collapse } from "antd";
import { Fragment } from "react";

import { Divider } from "@/toolkits/Divider";
import { Stack, VStack } from "@/toolkits/Stack";

const data = [
  {
    heading: "General",
    items: [
      {
        answer: `
          <p>The Vultisig Plugin Marketplace is a marketplace for self-custodial automation. It gives users the option to easily install plugins and automate their digital asset holdings without transferring custody or unilaterally granting access to their funds.</p>
          <p>Users decide how much access to grant and which processes to automate.</p>
        `,
        question: "What is the Vultisig Plugin Marketplace?",
      },
      {
        answer: `
          <p>It leverages MPC technology, which is already used in Vultisig plugins, to provide the highest level of self-custodial security.</p>
          <p>Users can install plugins and delegate access to them. Each plugin consists of a proposing side and a validating side, ensuring that each transaction is validated against the user's set rules.</p>
          <p>These rules can be deleted or changed, ensuring that no transaction is sent without pre-existing approval and giving users complete control over their installed plugins and automations.</p>
          <br />
          <p>Read more in our <a href="https://docs.vultisig.com/vultisig-ecosystem/marketplace" target="_blank" rel="noopener noreferrer">documentation</a>.</p>
        `,
        question: "How does it work?",
      },
      {
        answer: `
          <p>Self-custodial automation was not technologically possible until now. Thanks to Vultisig’s MPC technology, you can now securely delegate and automate specific parts of your wallet without risking your seed phrase or giving up custody.</p>
          <p>Vultisig Plugins enable the world's first self-custodial automation.</p>
        `,
        question: "Why is it unique?",
      },
      {
        answer:
          "Vultisig Plugins are considered safe… because the developers are known to the Vultisig team, and the plugins undergo a rigorous review process to ensure they function properly. An installed plugin can never access or move funds without the user's prior authorization, as the Plugin Marketplace's well-thought-out proposal/verification structure always ensures that only authorized user actions are fulfilled. Though some plugins and agents will have greater access to the wallet, thereby increasing the plugin's risk level, plugins will have a risk level assigned to ensure users are always aware of their funds' access.",
        question: "How safe is it?",
      },
    ],
  },
  {
    heading: "Developers",
    items: [
      {
        answer:
          "Plugins are programs that enable self-custodial automation and expand the functionality of your Vultisig wallet. They can be written in any programming language and directly integrate with the Vultisig Ecosystem.",
        question: "What are Plugins?",
      },
      {
        answer: `To create one, please follow the documentation <a href="https://docs.vultisig.com/developer-docs/app-store/ai-agents" target="_blank" rel="noopener noreferrer">here</a>.`,
        question: "How can I create one?",
      },
      {
        answer: `
          <p>Plugins can be monetized in different ways, including one-time payment or recurring payments, such as subscriptions.</p>
          <p>For more information, please refer to the latest monetization option <a href="https://docs.vultisig.com/developer-docs/app-store/infrastructure-overview/revenue" target="_blank" rel="noopener noreferrer">documentation</a>.</p>
        `,
        question: "Can I monetize my plugin?",
      },
      {
        answer:
          "Listing a plugin incurs only a small developer and plugin verification fee in $VULT, which will be burned to ensure that real, dedicated developers are building plugins in the Vultisig Plugin Marketplace. Furthermore, developers must run their plugins on dedicated servers that they must host.",
        question: "What are the costs and requirements?",
      },
    ],
  },
];

export const FaqPage = () => {
  return (
    <VStack $style={{ alignItems: "center", flexGrow: "1" }}>
      <VStack
        $style={{
          gap: "32px",
          maxWidth: "768px",
          padding: "48px 16px",
          width: "100%",
        }}
      >
        <Stack
          as="span"
          $style={{
            fontSize: "40px",
            justifyContent: "center",
            lineHeight: "42px",
          }}
        >
          FAQ
        </Stack>
        <VStack $style={{ gap: "72px" }}>
          {data.map(({ heading, items }, index) => (
            <VStack key={index} $style={{ gap: "24px" }}>
              <Stack
                as="span"
                $style={{ fontSize: "22px", lineHeight: "24px" }}
              >
                {heading}
              </Stack>
              {items.map(({ answer, question }, index) => (
                <Fragment key={index}>
                  {index > 0 && <Divider light />}
                  <Collapse
                    bordered={false}
                    items={[
                      {
                        key: "1",
                        label: question,
                        children: (
                          <Stack dangerouslySetInnerHTML={{ __html: answer }} />
                        ),
                      },
                    ]}
                    expandIconPlacement="end"
                    ghost
                  />
                </Fragment>
              ))}
            </VStack>
          ))}
        </VStack>
      </VStack>
    </VStack>
  );
};
