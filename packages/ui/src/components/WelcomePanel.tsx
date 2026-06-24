export interface WelcomePanelProps {
  title: string;
  description: string;
}

export function WelcomePanel({ title, description }: WelcomePanelProps) {
  return (
    <section aria-labelledby="welcome-title">
      <h1 id="welcome-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}
