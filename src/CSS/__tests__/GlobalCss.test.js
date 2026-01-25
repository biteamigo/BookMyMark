import globalStyles from "../GlobalCss";
import { PAGE_MARGIN } from "../../Utils/Constants";

describe("GlobalCss", () => {
  describe("globalStyles", () => {
    it("is defined", () => {
      expect(globalStyles).toBeDefined();
    });

    it("has pageView style", () => {
      expect(globalStyles.pageView).toBeDefined();
    });

    describe("pageView", () => {
      it("has flex: 1", () => {
        expect(globalStyles.pageView.flex).toBe(1);
      });

      it("has margin equal to PAGE_MARGIN", () => {
        expect(globalStyles.pageView.margin).toBe(PAGE_MARGIN);
      });

      it("has margin equal to 30", () => {
        expect(globalStyles.pageView.margin).toBe(30);
      });
    });
  });
});
