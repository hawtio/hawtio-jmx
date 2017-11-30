namespace Jmx {

  export class Operation {

    args: OperationArgument[];
    description: string;
    name: string;
    readableName: string;
    canInvoke: boolean;

    constructor(method: string, args: OperationArgument[], description: string) {
      this.args = args;
      this.description = description;
      this.name = Operation.buildName(method, args);
      this.readableName = Operation.buildReadableName(this.name);
      this.canInvoke = true;
    }

    private static buildName(method: string, args: OperationArgument[]) {
      return method + "(" + args.map(arg => arg.type).join() + ")";
    }

    private static buildReadableName(name: string) {
      let startParamsIndex = name.indexOf('(') + 1;
      let endParamsIndex = name.indexOf(')');
      if (startParamsIndex === endParamsIndex) {
        return name;
      }
      let paramsStr = name.substring(startParamsIndex, endParamsIndex);
      let params = paramsStr.split(',');
      let readableParams = params.map(param => {
        let lastDotIndex = param.lastIndexOf('.');
        return lastDotIndex > 0 ? param.substr(lastDotIndex + 1) : param;
      });
      let readableParamsStr = readableParams.join(', ');
      return name.replace(paramsStr, readableParamsStr);
    }
  }

  export interface OperationArgument {
    name: string;
    type: string;
    desc: string;
  }

}
