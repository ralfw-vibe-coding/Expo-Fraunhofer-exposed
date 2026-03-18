import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("App shell", () => {
  it("renders the project placeholder", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Expo Fraunhofer Exposed" }),
    ).toBeInTheDocument();
  });
});
