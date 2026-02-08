import React from "react";
import { render, screen } from "@testing-library/react-native";
import {
  DatabaseProvider,
  useDatabase,
  useFolderRepository,
  useBookmarkRepository,
  useTagRepository,
} from "../DatabaseContext";

describe("DatabaseContext", () => {
  it("useDatabase throws when used outside DatabaseProvider", () => {
    const ThrowingComponent = () => {
      useDatabase();
      return null;
    };
    expect(() => render(<ThrowingComponent />)).toThrow(
      "useDatabase must be used within a DatabaseProvider"
    );
  });

  it("DatabaseProvider provides db and repositories", () => {
    let captured;
    const Consumer = () => {
      captured = useDatabase();
      return null;
    };
    render(
      <DatabaseProvider>
        <Consumer />
      </DatabaseProvider>
    );
    expect(captured).toBeDefined();
    expect(captured.db).toBeDefined();
    expect(captured.folderRepository).toBeDefined();
    expect(captured.bookmarkRepository).toBeDefined();
    expect(captured.tagRepository).toBeDefined();
  });

  it("useFolderRepository returns folderRepository", () => {
    let repo;
    const Consumer = () => {
      repo = useFolderRepository();
      return null;
    };
    render(
      <DatabaseProvider>
        <Consumer />
      </DatabaseProvider>
    );
    expect(repo).toBeDefined();
    expect(typeof repo.getAll).toBe("function");
    expect(typeof repo.create).toBe("function");
  });

  it("useBookmarkRepository returns bookmarkRepository", () => {
    let repo;
    const Consumer = () => {
      repo = useBookmarkRepository();
      return null;
    };
    render(
      <DatabaseProvider>
        <Consumer />
      </DatabaseProvider>
    );
    expect(repo).toBeDefined();
    expect(typeof repo.getAll).toBe("function");
    expect(typeof repo.create).toBe("function");
  });

  it("useTagRepository returns tagRepository", () => {
    let repo;
    const Consumer = () => {
      repo = useTagRepository();
      return null;
    };
    render(
      <DatabaseProvider>
        <Consumer />
      </DatabaseProvider>
    );
    expect(repo).toBeDefined();
    expect(typeof repo.getAll).toBe("function");
    expect(typeof repo.create).toBe("function");
  });
});
