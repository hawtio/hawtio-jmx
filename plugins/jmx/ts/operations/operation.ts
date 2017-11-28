namespace Jmx {

  export class Operation {

    args: OperationArgument[];
    description: string;
    name: string;
    simpleName: string;
    canInvoke: boolean;

    constructor(method: string, args: OperationArgument[], description: string) {
      this.args = args;
      this.description = description;
      this.name = Operation.buildName(method, args);
      this.simpleName = Operation.buildSimpleName(this.name);
      this.canInvoke = true;
    }

    private static buildName(method: string, args: OperationArgument[]) {
      return method + "(" + args.map(arg => arg.type).join() + ")";
    }

    private static buildSimpleName(name: string) {
      let startParamsIndex = name.indexOf('(') + 1;
      let endParamsIndex = name.indexOf(')');
      if (startParamsIndex === endParamsIndex) {
        return name;
      } else {
        let paramsStr = name.substring(startParamsIndex, endParamsIndex);
        let params = paramsStr.split(',');
        let simpleParams = params.map(param => {
          let lastDotIndex = param.lastIndexOf('.');
          return lastDotIndex > 0 ? param.substr(lastDotIndex + 1) : param;
        });
        let simpleParamsStr = simpleParams.join(', ');
        let simpleOperationName = name.replace(paramsStr, simpleParamsStr);
        return simpleOperationName;
      }
    }
  }

  export interface OperationArgument {
    name: string;
    type: string;
    desc: string;
  }

}
