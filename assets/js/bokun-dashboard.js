(function ($) {
  'use strict';

  function getString(key, fallback) {
    if (typeof window.bokunDashboard === 'object' && window.bokunDashboard !== null && Object.prototype.hasOwnProperty.call(window.bokunDashboard, key)) {
      return window.bokunDashboard[key];
    }

    return fallback;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var $temp = $('<textarea readonly>');
      $temp.css({
        position: 'absolute',
        left: '-9999px',
        top: '0',
      });
      $('body').append($temp);
      $temp.val(text).select();

      try {
        var successful = document.execCommand('copy');
        if (successful) {
          resolve();
        } else {
          reject();
        }
      } catch (error) {
        reject(error);
      }

      $temp.remove();
    });
  }

  function showCopyFeedback($button, isError) {
    var originalText = $button.data('original-text');
    if (!originalText) {
      originalText = $.trim($button.text());
      $button.data('original-text', originalText);
    }

    var message = getString(isError ? 'copyError' : 'copied', isError ? 'Error' : 'Copied!');

    $button.addClass('has-feedback');
    $button.text(message);

    setTimeout(function () {
      $button.removeClass('has-feedback');
      $button.text(originalText);
    }, 1500);
  }

  function normalise(value) {
    return (value || '').toString().toLowerCase();
  }

  function applyFilters($dashboard) {
    var $searchInput = $dashboard.find('.bokun-dashboard-search-input input');
    var $filterCheckboxes = $dashboard.find('.bokun-dashboard-filter-options input[type="checkbox"]');
    var $rows = $dashboard.find('tbody tr');
    var $noResults = $dashboard.find('.bokun-dashboard-no-results');

    var searchTerm = normalise($searchInput.val().trim());
    var activeFilters = $filterCheckboxes.filter(':checked').map(function () {
      return $(this).val();
    }).get();
    var hasFilter = activeFilters.length > 0;
    var visibleCount = 0;

    $rows.each(function () {
      var $row = $(this);
      var rowSearch = normalise($row.data('search'));
      var rowStatuses = ($row.data('statuses') || '').toString().split('|').filter(Boolean);

      var matchesSearch = !searchTerm || rowSearch.indexOf(searchTerm) !== -1;
      var matchesFilter = !hasFilter || rowStatuses.some(function (status) {
        return activeFilters.indexOf(status) !== -1;
      });

      var isVisible = matchesSearch && matchesFilter;
      $row.toggle(isVisible);

      if (isVisible) {
        visibleCount += 1;
      }
    });

    if ($noResults.length) {
      var hasResults = visibleCount > 0;
      if (!hasResults) {
        var fallback = $noResults.data('default-text') || $noResults.text();
        $noResults.text(getString('noResults', fallback));
      } else {
        var baseText = $noResults.data('default-text');
        if (baseText) {
          $noResults.text(baseText);
        }
      }

      $noResults.toggleClass('is-visible', !hasResults);
      $noResults.prop('hidden', hasResults);
    }
  }

  function toggleClearButton($dashboard) {
    var $searchInput = $dashboard.find('.bokun-dashboard-search-input input');
    var $clearButton = $dashboard.find('.bokun-dashboard-clear-search');
    if (!$clearButton.length) {
      return;
    }

    var hasValue = Boolean($searchInput.val());
    $clearButton.toggleClass('is-visible', hasValue);
  }

  function initDashboard($dashboard) {
    var $searchInput = $dashboard.find('.bokun-dashboard-search-input input');
    var $clearSearch = $dashboard.find('.bokun-dashboard-clear-search');
    var $filterCheckboxes = $dashboard.find('.bokun-dashboard-filter-options input[type="checkbox"]');
    var $filterToggle = $dashboard.find('.bokun-dashboard-filter-toggle');
    var $filtersContainer = $dashboard.find('.bokun-dashboard-filters');
    var $dropdown = $dashboard.find('.bokun-dashboard-filter-dropdown');
    var $selectAllButton = $dashboard.find('.bokun-dashboard-filter-select-all');
    var $clearFiltersButton = $dashboard.find('.bokun-dashboard-filter-clear');

    function openDropdown() {
      if (!$filtersContainer.length) {
        return;
      }

      $('.bokun-dashboard-filters.is-open').not($filtersContainer).each(function () {
        var $other = $(this);
        $other.removeClass('is-open');
        $other.find('.bokun-dashboard-filter-dropdown').prop('hidden', true);
        $other.find('.bokun-dashboard-filter-toggle').attr('aria-expanded', 'false');
      });

      $filtersContainer.addClass('is-open');
      $dropdown.prop('hidden', false);
      $filterToggle.attr('aria-expanded', 'true');
    }

    function closeDropdown() {
      if (!$filtersContainer.length) {
        return;
      }
      $filtersContainer.removeClass('is-open');
      $dropdown.prop('hidden', true);
      $filterToggle.attr('aria-expanded', 'false');
    }

    $filterToggle.on('click', function () {
      if ($filtersContainer.hasClass('is-open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    $filterCheckboxes.on('change', function () {
      applyFilters($dashboard);
    });

    if ($selectAllButton.length) {
      $selectAllButton.on('click', function () {
        $filterCheckboxes.prop('checked', true);
        applyFilters($dashboard);
      });
    }

    if ($clearFiltersButton.length) {
      $clearFiltersButton.on('click', function () {
        $filterCheckboxes.prop('checked', false);
        applyFilters($dashboard);
      });
    }

    $searchInput.on('input', function () {
      toggleClearButton($dashboard);
      applyFilters($dashboard);
    });

    $clearSearch.on('click', function () {
      $searchInput.val('');
      toggleClearButton($dashboard);
      applyFilters($dashboard);
      $searchInput.trigger('focus');
    });

    $dashboard.on('click', '.bokun-dashboard-copy-button', function () {
      var $button = $(this);
      var value = $button.data('copyValue');
      if (typeof value === 'undefined') {
        return;
      }

      copyToClipboard(value.toString()).then(function () {
        showCopyFeedback($button, false);
      }).catch(function () {
        showCopyFeedback($button, true);
      });
    });

    toggleClearButton($dashboard);
    applyFilters($dashboard);
  }

  function handleDocumentClick(event) {
    var $target = $(event.target);

    $('.bokun-dashboard-filters.is-open').each(function () {
      var $filters = $(this);
      if ($filters.is($target) || $filters.has($target).length) {
        return;
      }

      $filters.removeClass('is-open');
      $filters.find('.bokun-dashboard-filter-dropdown').prop('hidden', true);
      $filters.find('.bokun-dashboard-filter-toggle').attr('aria-expanded', 'false');
    });
  }

  $(function () {
    var $dashboards = $('.bokun-dashboard');
    if (!$dashboards.length) {
      return;
    }

    $(document).on('click.bokunDashboard', handleDocumentClick);

    $dashboards.each(function () {
      initDashboard($(this));
    });
  });
})(jQuery);
