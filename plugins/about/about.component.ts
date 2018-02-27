namespace About {

  export class AboutController {
    flags: { open: boolean };
    title: string;
    productInfo: object[];
    additionalInfo: string;
    copyright: string;

    constructor(private configManager: Core.ConfigManager, private jolokia: JVM.DummyJolokia,
      private jolokiaService: JVM.JolokiaService) {
      'ngInject';
    }
    
    $onInit() {
      this.title = this.configManager.getBrandingValue('appName');
      this.additionalInfo = this.configManager.getBrandingValue('aboutDescription');
      if (!this.jolokia.isDummy && this.jolokia.version()) {
        this.productInfo = [
          { name: 'Jolokia', value: this.jolokia.version().agent }
        ];
        this.jolokiaService.getAttribute('hawtio:type=About', 'HawtioVersion')
          .then(hawtioVersion => this.productInfo.unshift({ name: 'Hawtio', value: hawtioVersion }));
      }
    }

    onClose() {
      this.flags.open = false;
    }
  }

  export const aboutComponent: angular.IComponentOptions = {
    bindings: {
      flags: '<'
    },
    template: `
      <pf-about-modal is-open="$ctrl.flags.open" on-close="$ctrl.onClose()" title="$ctrl.title"
          product-info="$ctrl.productInfo" additional-info="$ctrl.additionalInfo"></pf-about-modal>
    `,
    controller: AboutController
  };

}
