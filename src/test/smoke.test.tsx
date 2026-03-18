import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("App shell", () => {
  it("renders the click dummy entry point", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Klick-Dummy fuer Bereich, Request, Eingabe und Ausgabe",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Veranstaltungsorganisation/i }),
    ).toBeInTheDocument();
  });
});
