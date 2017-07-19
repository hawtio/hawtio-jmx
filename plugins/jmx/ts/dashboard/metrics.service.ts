namespace Jmx {

  export class MetricsService {

    private static METRICS = {
      "consumers": [
        {name: 'camel_inflight_exchanges', title: 'Inflight Exchanges'}
      ],
      "context": [
        {name: 'camel_delta_processing_time', title: 'Delta Processing Time'},
        {name: 'camel_exchanges_completed', title: 'Exchanges Completed'},
        {name: 'camel_exchanges_failed', title: 'Exchanges Failed'},
        {name: 'camel_exchanges_inflight', title: 'Exchanges Inflight'},
        {name: 'camel_exchanges_total', title: 'Exchanges Total'},
        {name: 'camel_external_redeliveries', title: 'External Redeliveries'},
        {name: 'camel_failures_handled', title: 'Failures Handled'},
        {name: 'camel_inflight_exchanges', title: 'Inflight Exchanges'},
        {name: 'camel_last_processing_time', title: 'Last Processing Time'},
        {name: 'camel_max_processing_time', title: 'Max Processing Time'},
        {name: 'camel_mean_processing_time', title: 'Mean Processing Time'},
        {name: 'camel_min_processing_time', title: 'Min Processing Time'},
        {name: 'camel_redeliveries', title: 'Redeliveries'},
        {name: 'camel_started_routes', title: 'Started Routes'},
        {name: 'camel_timeout', title: 'Timeout'},
        {name: 'camel_total_processing_time', title: 'Total Processing Time'},
        {name: 'camel_total_routes', title: 'Total Routes'},
        {name: 'camel_uptime_millis', title: 'Uptime (ms)'},
      ],
      "endpoints": [
        {name: 'camel_delay', title: 'Timer Delay'},
        {name: 'camel_period', title: 'Timer Period'},
        {name: 'camel_repeat_count', title: 'Repeat Count'}
      ],
      "errorhandlers": [
        {name: 'camel_back_off_multiplier', title: 'Back Off Multiplier'},
        {name: 'camel_collision_avoidance_factor', title: 'Collision Avoidance Factor'},
        {name: 'camel_collision_avoidance_percent', title: 'Collision Avoidance Percent'},
        {name: 'camel_maximum_redeliveries', title: 'Maximum Redeliveries'},
        {name: 'camel_maximum_redelivery_delay', title: 'Maximum Redelivery Delay'},
        {name: 'camel_pending_redelivery_count', title: 'Pending Redelivery Count'},
        {name: 'camel_redelivery_delay', title: 'Redelivery Delay'}
      ],
      "processors": [
        {name: 'camel_delta_processing_time', title: 'Delta Processing Time'},
        {name: 'camel_exchanges_completed', title: 'Exchanges Completed'},
        {name: 'camel_exchanges_failed', title: 'Exchanges Failed'},
        {name: 'camel_exchanges_inflight', title: 'Exchanges Inflight'},
        {name: 'camel_exchanges_total', title: 'Exchanges Total'},
        {name: 'camel_external_redeliveries', title: 'External Redeliveries'},
        {name: 'camel_failures_handled', title: 'Failures Handled'},
        {name: 'camel_index', title: 'Index'},
        {name: 'camel_last_processing_time', title: 'Last Processing Time'},
        {name: 'camel_max_processing_time', title: 'Max Processing Time'},
        {name: 'camel_mean_processing_time', title: 'Mean Processing Time'},
        {name: 'camel_min_processing_time', title: 'Min Processing Time'},
        {name: 'camel_redeliveries', title: 'Redeliveries'},
        {name: 'camel_total_processing_time', title: 'Total Processing Time (ms)'}
      ],
      "routes": [
        {name: 'camel_delta_processing_time', title: 'Delta Processing Time'},
        {name: 'camel_exchanges_completed', title: 'Exchanges Completed'},
        {name: 'camel_exchanges_failed', title: 'Exchanges Failed'},
        {name: 'camel_exchanges_inflight', title: 'Exchanges Inflight'},
        {name: 'camel_exchanges_total', title: 'Exchanges Total'},
        {name: 'camel_external_redeliveries', title: 'External Redeliveries'},
        {name: 'camel_failures_handled', title: 'Failures Handled'},
        {name: 'camel_inflight_exchanges', title: 'Inflight Exchanges'},
        {name: 'camel_last_processing_time', title: 'Last Processing Time'},
        {name: 'camel_max_processing_time', title: 'Max Processing Time'},
        {name: 'camel_mean_processing_time', title: 'Mean Processing Time'},
        {name: 'camel_min_processing_time', title: 'Min Processing Time'},
        {name: 'camel_oldest_inflight_duration', title: 'Oldest Inflight Duration'},
        {name: 'camel_redeliveries', title: 'Redeliveries'},
        {name: 'camel_total_processing_time', title: 'TotalProcessingTime'},
        {name: 'camel_uptime_millis', title: 'Uptime (ms)'}
      ],
      "services": [
        {name: 'camel_max_duration', title: 'Max Duration'},
        {name: 'camel_mean_duration', title: 'Mean Duration'},
        {name: 'camel_min_duration', title: 'Min Duration'},
        {name: 'camel_size', title: 'Size'},
        {name: 'camel_threads_blocked', title: 'Threads Blocked'},
        {name: 'camel_threads_interrupted', title: 'Threads Interrupted'},
        {name: 'camel_total_duration', title: 'Total Duration'}
      ],
      "tracer": [
        {name: 'camel_body_max_chars', title: 'Body Max Chars'},
        {name: 'camel_debug_counter', title: 'Debug Counter'},
        {name: 'camel_fallback_timeout', title: 'Fallback Timeout'}
      ]
    };

    getMetrics(type: string) {
      return MetricsService.METRICS[type];
    }

  }

}
