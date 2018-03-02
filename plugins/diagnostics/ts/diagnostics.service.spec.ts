/// <reference path="diagnostics.service.ts"/>

describe("DiagnosticsService", function() {

  let diagnosticsService;

  beforeEach(function() {
    diagnosticsService = new Diagnostics.DiagnosticsService(null, null);
  });

  it("should exist", function() {
    expect(diagnosticsService).not.toBeUndefined();
  });

});
