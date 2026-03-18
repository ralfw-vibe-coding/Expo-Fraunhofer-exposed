import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("App shell", () => {
  it("renders the click dummy entry point", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Bereich waehlen, Request starten, Expo sauber erfassen",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Veranstaltungsorganisation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Expo anlegen/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Teilnehmer registrieren/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Referenten/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Teilnehmer/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Praesentationen einreichen bis"),
    ).toBeInTheDocument();
  });
});
