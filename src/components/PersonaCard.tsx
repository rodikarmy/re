import { useRef } from "react";
import { PersonaCaptureForm } from "./persona-capture";
import { TintProvider } from "./persona-capture/tint";
import type { SubmissionCallbacks } from "./persona-capture/types";
import {
  submitPersona,
  submitContactMessage,
  subscribeContactUpdates,
} from "../lib/api";

/**
 * PersonaCard (`Vt` в paper-stack-чанке, строки 788-856) — wiring формы
 * к API. Реальные эндпоинты заменены заглушками из src/lib/api.ts.
 *
 * Оригинал шлёт POST /session-agent c intent=submit-persona и добавляет
 * аналитическую обвязку (ut()) в payload; здесь она опущена (TODO).
 */
export interface PersonaCardProps {
  source?: string;
  showPersonaCard?: boolean;
}

export function PersonaCard({ source }: PersonaCardProps) {
  const submitCallbacksRef = useRef<SubmissionCallbacks | null>(null);
  const messageCallbacksRef = useRef<SubmissionCallbacks | null>(null);

  return (
    <TintProvider>
      <PersonaCaptureForm
        source={source}
        onSubscribe={(submissionId) => subscribeContactUpdates(submissionId)}
        onSubmitMessage={
          source === "get-in-touch"
            ? (payload, callbacks) => {
                messageCallbacksRef.current = callbacks;
                submitContactMessage(payload).then(
                  () => {
                    messageCallbacksRef.current?.onSuccess();
                    messageCallbacksRef.current = null;
                  },
                  () => {
                    messageCallbacksRef.current?.onError(
                      "Your message could not be sent. Please try again.",
                    );
                    messageCallbacksRef.current = null;
                  },
                );
              }
            : undefined
        }
        onSubmit={(payload, callbacks) => {
          submitCallbacksRef.current = callbacks;
          // TODO: ...payload + аналитика (ut()) + receiveUpdates: String(bool)
          submitPersona(payload).then(
            (result) => {
              submitCallbacksRef.current?.onSuccess({
                firstName: result?.personName?.firstName,
              });
              submitCallbacksRef.current = null;
            },
            () => {
              submitCallbacksRef.current?.onError(
                "Something went wrong. Please try again.",
              );
              submitCallbacksRef.current = null;
            },
          );
        }}
      />
    </TintProvider>
  );
}
