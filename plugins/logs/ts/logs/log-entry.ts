namespace Logs {

  export class LogEntry {

    className: string;
    containerName: string;
    exception: string;
    fileName: string;
    hasOSGiProps: boolean;
    hasMDCProps: boolean;
    hasLogSourceHref: boolean;
    hasLogSourceLineHref: boolean;
    host: string;
    level: string;
    levelClass: string;
    lineNumber: string;
    logger: string;
    logSourceUrl: string;
    methodName: string;
    properties: {};
    mdcProperties: {};
    sanitizedMessage: string;
    seq: string;
    thread: string;
    timestamp: string;

    constructor(event) {
      this.className = event.className;
      this.containerName = event.containerName;
      this.exception = event.exception;
      this.fileName = event.fileName;
      this.hasOSGiProps = LogEntry.hasOSGiProps(event.properties);
      this.hasLogSourceHref = LogEntry.hasLogSourceHref(event.properties);
      this.hasLogSourceLineHref = LogEntry.hasLogSourceLineHref(event.lineNumber);
      this.host = event.host;
      this.level = event.level;
      this.levelClass = LogEntry.getLevelClass(event.level);
      this.lineNumber = event.lineNumber;
      this.logger = event.logger;
      this.logSourceUrl = LogEntry.getLogSourceUrl(event);
      this.methodName = event.methodName;
      this.properties = event.properties;
      this.mdcProperties = LogEntry.mdcProperties(event.properties);
      this.hasMDCProps = Object.keys(this.mdcProperties).length !== 0;
      this.sanitizedMessage = Core.escapeHtml(event.message);
      this.seq = event.seq;
      this.thread = event.thread;
      this.timestamp = event.timestamp;
    }

    private static getLevelClass(level) {
      switch (level) {
        case 'INFO': return 'text-info';
        case 'WARN': return 'text-warning';
        case 'ERROR': return 'text-danger';
        default: return '';
      }
    };

    private static hasOSGiProps(properties: {}): boolean {
      return properties && Object.keys(properties).some(key => key.indexOf('bundle') === 0);
    }

    private static hasLogSourceHref(properties: {}): boolean {
      return properties && properties['maven.coordinates'] && properties['maven.coordinates'] !== '';
    }

    private static hasLogSourceLineHref(lineNumber: string): boolean {
      return lineNumber && lineNumber !== "" && lineNumber !== "?";
    }

    private static getLogSourceUrl(event): string {
      var fileName = LogEntry.removeQuestion(event.fileName);
      var className = LogEntry.removeQuestion(event.className);
      var properties = event.properties;
      var mavenCoords = "";
      if (properties) {
        mavenCoords = properties["maven.coordinates"];
      }
      if (mavenCoords && fileName) {
        var link = "#/source/view/" + mavenCoords + "/class/" + className + "/" + fileName;
        var line = event.lineNumber;
        if (line) {
          link += "?line=" + line;
        }
        return link;
      } else {
        return "";
      }
    }

    private static removeQuestion(text: string): string {
      return (!text || text === "?") ? null : text;
    }

    static mdcProperties(properties: {}): {} {
      if (!properties) {
        return properties;
      }
      return Object.keys(properties)
        .filter(key => !_.startsWith(key, 'bundle.') && key !== 'maven.coordinates')
        .reduce((custom, key) => {
          custom[key] = properties[key];
          return custom;
        }, {});
    }

  }

}
