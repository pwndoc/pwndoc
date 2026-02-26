import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import NetworkPage from '@/pages/audits/edit/network/index.vue'
import AuditService from '@/services/audit'

// Mock dependencies
vi.mock('@/services/audit', () => ({
  default: {
    getAuditNetwork: vi.fn(),
    updateAuditNetwork: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    AUDIT_VIEW_STATE: {
      EDIT: 0,
      EDIT_READONLY: 1
    }
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Notify: {
      create: vi.fn()
    },
    Dialog: {
      create: vi.fn(() => ({
        onOk: vi.fn()
      }))
    }
  }
})

describe('Audits Edit Network Page', () => {
  let router
  let pinia
  let i18n
  let wrappers = []

  const mockAuditData = {
    data: {
      datas: {
        scope: [
          {
            name: 'Scope 1',
            hosts: [
              {
                ip: '192.168.1.1',
                hostname: 'host1.local',
                os: 'Linux',
                services: [
                  { port: '80', protocol: 'tcp', name: 'http', version: '2.4.6' },
                  { port: '443', protocol: 'tcp', name: 'https', version: '2.4.6' }
                ]
              }
            ]
          },
          {
            name: 'Scope 2',
            hosts: []
          }
        ]
      }
    }
  }

  beforeEach(() => {
    wrappers = []
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/audits/:auditId/network',
          name: 'audit-network',
          component: NetworkPage
        }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: {
        'en-US': {
          originalAudit: 'Original Audit',
          multi: 'Multi',
          import: 'Import',
          'btn.save': 'Save',
          'msg.selectHost': 'Select Host',
          'msg.importHostsFirst': 'Import hosts first',
          'msg.auditUpdateOk': 'Audit updated successfully',
          'msg.thereAreUnsavedChanges': 'There are unsaved changes',
          'msg.doYouWantToLeave': 'Do you want to leave?',
          'btn.confirm': 'Confirm',
          'btn.cancel': 'Cancel'
        }
      }
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount())
    wrappers = []
  })

  const createWrapper = (options = {}) => {
    const wrapper = mount(NetworkPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          breadcrumb: true,
          'q-card': true,
          'q-card-section': true,
          'q-separator': true,
          'q-select': true,
          'q-btn': true,
          'q-btn-dropdown': true,
          'q-list': true,
          'q-item': true,
          'q-item-section': true,
          'q-item-label': true,
          'q-chip': true,
          'q-table': true
        },
        mocks: {
          $t: (key) => key,
          $route: {
            params: { auditId: 'audit-123' }
          },
          $socket: {
            emit: vi.fn()
          },
          $_: {
            cloneDeep: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
            isEqual: vi.fn((a, b) => JSON.stringify(a) === JSON.stringify(b))
          },
          $settings: {},
          ...(options.mocks || {})
        },
        provide: {
          frontEndAuditState: options.frontEndAuditState !== undefined ? options.frontEndAuditState : 0,
          auditParent: options.auditParent || {
            name: 'Test Audit',
            auditType: 'Internal',
            state: 'In Progress',
            approvals: [],
            parentId: null,
            type: 'default'
          }
        }
      }
    })

    wrappers.push(wrapper)
    return wrapper
  }

  describe('Initialization', () => {
    it('should set auditId from route params on mount', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.auditId).toBe('audit-123')
    })

    it('should call getAuditNetwork on mount', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(AuditService.getAuditNetwork).toHaveBeenCalledWith('audit-123')
    })

    it('should emit socket menu event on mount', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const socketEmit = vi.fn()
      const wrapper = createWrapper({
        mocks: {
          $socket: { emit: socketEmit }
        }
      })
      await wrapper.vm.$nextTick()

      expect(socketEmit).toHaveBeenCalledWith('menu', { menu: 'network', room: 'audit-123' })
    })

    it('should have correct initial data state', () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()

      expect(wrapper.vm.currentHost).toBeNull()
      expect(wrapper.vm.targetsOptions).toEqual([])
      expect(wrapper.vm.selectedTargets).toEqual([])
    })

    it('should have correct datatable headers', () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()

      expect(wrapper.vm.dtHostHeaders).toHaveLength(4)
      expect(wrapper.vm.dtHostHeaders.map(h => h.name)).toEqual(['port', 'protocol', 'name', 'version'])
    })

    it('should have correct datatable pagination defaults', () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()

      expect(wrapper.vm.hostPagination).toEqual({
        page: 1,
        rowsPerPage: 20,
        sortBy: 'port'
      })
    })
  })

  describe('getAuditNetwork', () => {
    it('should load audit data and set audit and auditOrig', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.audit).toEqual(mockAuditData.data.datas)
      expect(wrapper.vm.auditOrig).toEqual(mockAuditData.data.datas)
    })

    it('should handle error when loading audit network', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      AuditService.getAuditNetwork.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('updateAuditNetwork', () => {
    it('should call AuditService.updateAuditNetwork with correct params', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      AuditService.updateAuditNetwork.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateAuditNetwork()

      expect(AuditService.updateAuditNetwork).toHaveBeenCalledWith('audit-123', wrapper.vm.audit)
    })

    it('should update auditOrig on successful save', async () => {
      const { Notify } = await import('quasar')

      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      AuditService.updateAuditNetwork.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateAuditNetwork()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.auditUpdateOk',
          color: 'positive'
        })
      )
    })

    it('should show error notification on save failure', async () => {
      const { Notify } = await import('quasar')

      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      AuditService.updateAuditNetwork.mockRejectedValue({
        response: { data: { datas: 'Save failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateAuditNetwork()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Save failed',
          color: 'negative'
        })
      )
    })
  })

  describe('selectHostsLabel computed', () => {
    it('should return selectHost message when targetsOptions has items', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()
      wrapper.vm.targetsOptions = [{ label: '10.0.0.1', value: '10.0.0.1', host: {} }]
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.selectHostsLabel).toBe('msg.selectHost')
    })

    it('should return importHostsFirst message when targetsOptions is empty', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()
      wrapper.vm.targetsOptions = []
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.selectHostsLabel).toBe('msg.importHostsFirst')
    })
  })

  describe('updateScopeHosts', () => {
    it('should push selected hosts into scope hosts', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const scope = { name: 'Scope 2', hosts: [] }
      const newHost = { ip: '10.0.0.1', hostname: 'newhost', services: [] }
      wrapper.vm.selectedTargets['Scope 2'] = [{ host: newHost }]

      wrapper.vm.updateScopeHosts(scope)

      expect(scope.hosts).toHaveLength(1)
      expect(scope.hosts[0]).toEqual(newHost)
    })

    it('should handle undefined selectedTargets for scope', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const scope = { name: 'NonExistent', hosts: [] }

      // Should not throw when selectedTargets[scope.name] is undefined
      expect(() => wrapper.vm.updateScopeHosts(scope)).not.toThrow()
      expect(scope.hosts).toHaveLength(0)
    })
  })

  describe('getXmlElementByAttribute', () => {
    it('should return element matching attribute value', () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()

      const mockElements = [
        { getAttribute: (attr) => attr === 'type' ? 'A' : null },
        { getAttribute: (attr) => attr === 'type' ? 'PTR' : null },
        { getAttribute: (attr) => attr === 'type' ? 'CNAME' : null }
      ]

      const result = wrapper.vm.getXmlElementByAttribute(mockElements, 'type', 'PTR')
      expect(result).toBe(mockElements[1])
    })

    it('should return null when no element matches', () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()

      const mockElements = [
        { getAttribute: () => 'A' }
      ]

      const result = wrapper.vm.getXmlElementByAttribute(mockElements, 'type', 'PTR')
      expect(result).toBeNull()
    })
  })

  describe('parseXmlNmap', () => {
    it('should parse valid Nmap XML and populate targetsOptions', async () => {
      const { Notify } = await import('quasar')
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nmapXml = `<?xml version="1.0"?>
        <nmaprun>
          <host>
            <status state="up"/>
            <address addr="192.168.1.10"/>
            <hostnames>
              <hostname name="server.local" type="PTR"/>
            </hostnames>
            <ports>
              <port protocol="tcp" portid="80">
                <state state="open"/>
                <service name="http" product="Apache" version="2.4"/>
              </port>
              <port protocol="tcp" portid="22">
                <state state="closed"/>
                <service name="ssh" product="OpenSSH" version="7.9"/>
              </port>
            </ports>
          </host>
        </nmaprun>`

      wrapper.vm.parseXmlNmap(nmapXml)

      expect(wrapper.vm.targetsOptions).toHaveLength(1)
      expect(wrapper.vm.targetsOptions[0].label).toBe('192.168.1.10')
      expect(wrapper.vm.targetsOptions[0].host.ip).toBe('192.168.1.10')
      expect(wrapper.vm.targetsOptions[0].host.hostname).toBe('server.local')
      // Only open ports should be included
      expect(wrapper.vm.targetsOptions[0].host.services).toHaveLength(1)
      expect(wrapper.vm.targetsOptions[0].host.services[0].port).toBe('80')

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Successfully imported 1 hosts',
          color: 'positive'
        })
      )

      console.log.mockRestore()
    })

    it('should skip hosts with status down', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nmapXml = `<?xml version="1.0"?>
        <nmaprun>
          <host>
            <status state="down"/>
            <address addr="192.168.1.10"/>
            <hostnames/>
            <ports>
              <port protocol="tcp" portid="80">
                <state state="open"/>
                <service name="http"/>
              </port>
            </ports>
          </host>
        </nmaprun>`

      wrapper.vm.parseXmlNmap(nmapXml)

      expect(wrapper.vm.targetsOptions).toHaveLength(0)
      console.log.mockRestore()
    })

    it('should handle Nmap XML with no host elements', async () => {
      const { Notify } = await import('quasar')
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nmapXml = `<?xml version="1.0"?>
        <nmaprun></nmaprun>`

      wrapper.vm.parseXmlNmap(nmapXml)

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error parsing Nmap',
          color: 'negative'
        })
      )

      console.log.mockRestore()
    })

    it('should handle host without hostname element', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nmapXml = `<?xml version="1.0"?>
        <nmaprun>
          <host>
            <status state="up"/>
            <address addr="10.0.0.1"/>
            <hostnames></hostnames>
            <ports>
              <port protocol="tcp" portid="443">
                <state state="open"/>
                <service name="https" product="nginx" version="1.18"/>
              </port>
            </ports>
          </host>
        </nmaprun>`

      wrapper.vm.parseXmlNmap(nmapXml)

      expect(wrapper.vm.targetsOptions).toHaveLength(1)
      expect(wrapper.vm.targetsOptions[0].host.hostname).toBe('Unknown')

      console.log.mockRestore()
    })

    it('should handle port without service details', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nmapXml = `<?xml version="1.0"?>
        <nmaprun>
          <host>
            <status state="up"/>
            <address addr="10.0.0.1"/>
            <hostnames></hostnames>
            <ports>
              <port protocol="tcp" portid="8080">
                <state state="open"/>
              </port>
            </ports>
          </host>
        </nmaprun>`

      wrapper.vm.parseXmlNmap(nmapXml)

      expect(wrapper.vm.targetsOptions).toHaveLength(1)
      const service = wrapper.vm.targetsOptions[0].host.services[0]
      expect(service.product).toBe('Unknown')
      expect(service.name).toBe('Unknown')
      expect(service.version).toBe('Unknown')

      console.log.mockRestore()
    })

    it('should parse OS information from Nmap XML', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nmapXml = `<?xml version="1.0"?>
        <nmaprun>
          <host>
            <status state="up"/>
            <address addr="10.0.0.1"/>
            <hostnames></hostnames>
            <os>
              <osclass osfamily="Linux"/>
            </os>
            <ports>
              <port protocol="tcp" portid="22">
                <state state="open"/>
                <service name="ssh" product="OpenSSH" version="8.2"/>
              </port>
            </ports>
          </host>
        </nmaprun>`

      wrapper.vm.parseXmlNmap(nmapXml)

      expect(wrapper.vm.targetsOptions[0].host.os).toBe('Linux')

      console.log.mockRestore()
    })
  })

  describe('parseXmlNessus', () => {
    it('should parse valid Nessus XML and populate targetsOptions', async () => {
      const { Notify } = await import('quasar')
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nessusXml = `<?xml version="1.0"?>
        <NessusClientData_v2>
          <Report>
            <ReportHost name="192.168.1.20">
              <HostProperties>
                <tag name="host-ip">192.168.1.20</tag>
                <tag name="operating-system">Linux Kernel 5.4</tag>
                <tag name="host-fqdn">server.example.com</tag>
              </HostProperties>
              <ReportItem port="443" protocol="tcp" svc_name="https" svc_product="nginx" svc_version="1.18"/>
              <ReportItem port="80" protocol="tcp" svc_name="http" svc_product="Apache" svc_version="2.4"/>
            </ReportHost>
          </Report>
        </NessusClientData_v2>`

      wrapper.vm.parseXmlNessus(nessusXml)

      expect(wrapper.vm.targetsOptions).toHaveLength(1)
      expect(wrapper.vm.targetsOptions[0].label).toBe('192.168.1.20')
      expect(wrapper.vm.targetsOptions[0].host.ip).toBe('192.168.1.20')
      expect(wrapper.vm.targetsOptions[0].host.hostname).toBe('server.example.com')
      expect(wrapper.vm.targetsOptions[0].host.os).toBe('Linux Kernel 5.4')
      expect(wrapper.vm.targetsOptions[0].host.services).toHaveLength(2)

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Successfully imported 1 hosts',
          color: 'positive'
        })
      )

      console.log.mockRestore()
    })

    it('should skip port 0 entries in Nessus', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nessusXml = `<?xml version="1.0"?>
        <NessusClientData_v2>
          <Report>
            <ReportHost name="10.0.0.1">
              <HostProperties>
                <tag name="host-ip">10.0.0.1</tag>
              </HostProperties>
              <ReportItem port="0" protocol="tcp" svc_name="general"/>
              <ReportItem port="22" protocol="tcp" svc_name="ssh" svc_product="OpenSSH" svc_version="8.2"/>
            </ReportHost>
          </Report>
        </NessusClientData_v2>`

      wrapper.vm.parseXmlNessus(nessusXml)

      expect(wrapper.vm.targetsOptions[0].host.services).toHaveLength(1)
      expect(wrapper.vm.targetsOptions[0].host.services[0].port).toBe('22')

      console.log.mockRestore()
    })

    it('should deduplicate ports in Nessus', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nessusXml = `<?xml version="1.0"?>
        <NessusClientData_v2>
          <Report>
            <ReportHost name="10.0.0.1">
              <HostProperties>
                <tag name="host-ip">10.0.0.1</tag>
              </HostProperties>
              <ReportItem port="80" protocol="tcp" svc_name="http" svc_product="Apache" svc_version="2.4"/>
              <ReportItem port="80" protocol="tcp" svc_name="http" svc_product="Apache" svc_version="2.4"/>
            </ReportHost>
          </Report>
        </NessusClientData_v2>`

      wrapper.vm.parseXmlNessus(nessusXml)

      // Should deduplicate same port
      expect(wrapper.vm.targetsOptions[0].host.services).toHaveLength(1)

      console.log.mockRestore()
    })

    it('should use netbios-name as hostname fallback', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nessusXml = `<?xml version="1.0"?>
        <NessusClientData_v2>
          <Report>
            <ReportHost name="10.0.0.1">
              <HostProperties>
                <tag name="host-ip">10.0.0.1</tag>
                <tag name="netbios-name">WORKSTATION1</tag>
              </HostProperties>
              <ReportItem port="445" protocol="tcp" svc_name="smb"/>
            </ReportHost>
          </Report>
        </NessusClientData_v2>`

      wrapper.vm.parseXmlNessus(nessusXml)

      expect(wrapper.vm.targetsOptions[0].host.hostname).toBe('WORKSTATION1')

      console.log.mockRestore()
    })

    it('should fallback to host name attribute when no host-ip tag', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nessusXml = `<?xml version="1.0"?>
        <NessusClientData_v2>
          <Report>
            <ReportHost name="10.0.0.99">
              <HostProperties>
                <tag name="operating-system">Windows 10</tag>
              </HostProperties>
              <ReportItem port="3389" protocol="tcp" svc_name="rdp"/>
            </ReportHost>
          </Report>
        </NessusClientData_v2>`

      wrapper.vm.parseXmlNessus(nessusXml)

      expect(wrapper.vm.targetsOptions[0].host.ip).toBe('10.0.0.99')

      console.log.mockRestore()
    })

    it('should handle Nessus XML with no ReportHost elements', async () => {
      const { Notify } = await import('quasar')
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const nessusXml = `<?xml version="1.0"?>
        <NessusClientData_v2>
          <Report></Report>
        </NessusClientData_v2>`

      wrapper.vm.parseXmlNessus(nessusXml)

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error parsing Nessus',
          color: 'negative'
        })
      )

      console.log.mockRestore()
    })
  })

  describe('Keyboard shortcut', () => {
    it('should call updateAuditNetwork on ctrl+s when in edit state', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      AuditService.updateAuditNetwork.mockResolvedValue({})

      const wrapper = createWrapper({ frontEndAuditState: 0 }) // EDIT state
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const event = new KeyboardEvent('keydown', {
        keyCode: 83,
        ctrlKey: true,
        bubbles: true
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(AuditService.updateAuditNetwork).toHaveBeenCalled()
    })

    it('should not call updateAuditNetwork on ctrl+s when in readonly state', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper({ frontEndAuditState: 1 }) // EDIT_READONLY state
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Clear any calls from component initialization before testing keyboard shortcut
      AuditService.updateAuditNetwork.mockClear()

      const event = new KeyboardEvent('keydown', {
        keyCode: 83,
        ctrlKey: true,
        bubbles: true
      })

      document.dispatchEvent(event)

      expect(AuditService.updateAuditNetwork).not.toHaveBeenCalled()
    })
  })

  describe('importNetworkScan', () => {
    it('should read file and call parseXmlNmap for nmap type', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const parseNmapSpy = vi.spyOn(wrapper.vm, 'parseXmlNmap').mockImplementation(() => {})

      const xmlContent = '<nmaprun></nmaprun>'
      const file = new File([xmlContent], 'scan.xml', { type: 'text/xml' })

      wrapper.vm.importNetworkScan([file], 'nmap')

      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(parseNmapSpy).toHaveBeenCalledWith(xmlContent)

      console.log.mockRestore()
    })

    it('should read file and call parseXmlNessus for nessus type', async () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)
      vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const parseNessusSpy = vi.spyOn(wrapper.vm, 'parseXmlNessus').mockImplementation(() => {})

      const xmlContent = '<NessusClientData_v2></NessusClientData_v2>'
      const file = new File([xmlContent], 'scan.nessus', { type: 'text/xml' })

      wrapper.vm.importNetworkScan([file], 'nessus')

      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(parseNessusSpy).toHaveBeenCalledWith(xmlContent)

      console.log.mockRestore()
    })
  })

  describe('Port sorting', () => {
    it('should sort ports numerically in dtHostHeaders', () => {
      AuditService.getAuditNetwork.mockResolvedValue(mockAuditData)

      const wrapper = createWrapper()
      const portHeader = wrapper.vm.dtHostHeaders.find(h => h.name === 'port')

      expect(portHeader.sort('80', '443')).toBeLessThan(0)
      expect(portHeader.sort('443', '80')).toBeGreaterThan(0)
      expect(portHeader.sort('80', '80')).toBe(0)
      expect(portHeader.sort('8080', '443')).toBeGreaterThan(0)
    })
  })
})
