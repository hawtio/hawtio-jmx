/// <reference path="../folder.ts"/>

namespace Jmx {

  export class JmxInfo {
    
    context: string;
    type: string;
    name: string;
    id: string;

    constructor(nodeSelection: NodeSelection) {
      this.context = nodeSelection.entries.context;
      this.name = nodeSelection.entries.name.replace(/"/g, '');
      this.type = nodeSelection.entries.type;
      this.id = `${this.context}-${this.type}-${this.name}`;
    }
    
  }

}
